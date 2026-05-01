import random
import json
import copy
import matplotlib.pyplot as plt
import numpy as np
import os

from movie_dataset import movies
import rl_engine
import thompson_engine

# ============================================================
# SIMULATION SETTINGS
# ============================================================
EPISODES = 3000
WINDOW_SIZE = 300
OUTPUT_DIR = "simulation_results"

# Set seeds for consistent research results
random.seed(42)
np.random.seed(42)

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# ============================================================
# DATA ENHANCEMENT (Increased Distractors to make it MUCH harder)
# ============================================================
enhanced_movies = copy.deepcopy(movies)
# Add 1000 distractor movies to make the search space massive
for i in range(1000):
    enhanced_movies.append({
        "id": f"distractor_{i}",
        "title": f"Generic Movie {i}",
        "genre": random.choice(["Action", "Comedy", "Drama", "Thriller", "Horror", "Sci-Fi", "Romance"]),
        "primary_mood": random.choice(["Happy", "Dark", "Fun", "Intense", "Sad", "Brave", "Calm"]),
        "keywords": ["generic", "background", "unrelated"],
        "popularity": random.uniform(1, 3),
        "reward_score": 0,
        "recommend_count": 0
    })

# ============================================================
# USER MODEL (More specific preferences)
# ============================================================
contexts = [
    {"mood": "Happy", "genre": "Comedy", "keywords": ["love", "friendship"], "pref_weight": 2.5},
    {"mood": "Thrilling", "genre": "Action", "keywords": ["war", "revenge"], "pref_weight": 2.5},
    {"mood": "Emotional", "genre": "Drama", "keywords": ["family", "love"], "pref_weight": 2.5},
    {"mood": "Dark", "genre": "Thriller", "keywords": ["crime", "mystery"], "pref_weight": 2.5},
    {"mood": "Inspiring", "genre": "Action", "keywords": ["freedom", "social"], "pref_weight": 2.5},
]

def get_reward(movie, context, noise_level=1.2):
    # Base reward is lower for non-matches
    base_reward = 0.5 
    
    # Significant reward for correct mood
    if movie.get("primary_mood") == context["mood"]:
        base_reward += 2.2
    else:
        base_reward -= 1.5 # Heavier penalty for wrong mood
        
    # Significant reward for correct genre
    if movie.get("genre") == context["genre"]:
        base_reward += 1.8
    else:
        base_reward -= 0.8
        
    # Keywords match
    keywords = movie.get("keywords") or []
    m_kw = set(k.strip().lower() for k in keywords) if isinstance(keywords, list) else set()
    c_kw = set(context.get("keywords", []))
    match_count = len(m_kw & c_kw)
    base_reward += match_count * 1.2

    # Natural stochasticity: even with perfect match, user might have a bad day
    # This caps the maximum achievable accuracy at around 95%
    if random.random() < 0.05: 
        return random.uniform(0, 2) # Random low reward
    
    noise = random.normalvariate(0, noise_level)
    return max(0, min(10, base_reward + noise))

def get_optimal_reward(all_movies, context):
    rewards = []
    for m in all_movies:
        r = 0.5
        if m.get("primary_mood") == context["mood"]: r += 2.2
        else: r -= 1.5
        if m.get("genre") == context["genre"]: r += 1.8
        else: r -= 0.8
        keywords = m.get("keywords") or []
        m_kw = set(k.strip().lower() for k in keywords) if isinstance(keywords, list) else set()
        r += len(m_kw & set(context["keywords"])) * 1.2
        rewards.append(r)
    return max(rewards)

# ============================================================
# INITIALIZATION
# ============================================================
movies_eps = copy.deepcopy(enhanced_movies)
movies_ts = copy.deepcopy(enhanced_movies)

eps_success_history = []
ts_success_history = []

metrics = {
    "eps": {"rolling_acc": [], "cum_regret": [], "cum_reward": [], "exploration": []},
    "ts": {"rolling_acc": [], "cum_regret": [], "cum_reward": [], "exploration": []}
}

eps_total_regret = 0
ts_total_regret = 0
eps_total_reward = 0
ts_total_reward = 0

# ============================================================
# SIMULATION LOOP
# ============================================================
print(f"Starting advanced simulation for {EPISODES} episodes...")

for e in range(1, EPISODES + 1):
    context = random.choice(contexts)
    optimal = get_optimal_reward(enhanced_movies, context)

    # 1. EPSILON-GREEDY
    movie_e, _, epsilon = rl_engine.select_movie(movies_eps, context, e)
    reward_e = get_reward(movie_e, context)
    rl_engine.update(movie_e, (1 if reward_e > 3.2 else -1))
    
    eps_success_history.append(1 if reward_e > 3.2 else 0)
    eps_total_regret += (optimal - reward_e)
    eps_total_reward += reward_e
    
    metrics["eps"]["rolling_acc"].append(np.mean(eps_success_history[-WINDOW_SIZE:]))
    metrics["eps"]["cum_regret"].append(eps_total_regret)
    metrics["eps"]["cum_reward"].append(eps_total_reward)
    metrics["eps"]["exploration"].append(epsilon)

    # 2. THOMPSON SAMPLING
    movie_ts_obj, _ = thompson_engine.select_movie_thompson(movies_ts, context)
    reward_ts = get_reward(movie_ts_obj, context)
    thompson_engine.update(movie_ts_obj, (1 if reward_ts > 3.2 else -1))
    
    ts_success_history.append(1 if reward_ts > 3.2 else 0)
    ts_total_regret += (optimal - reward_ts)
    ts_total_reward += reward_ts
    
    metrics["ts"]["rolling_acc"].append(np.mean(ts_success_history[-WINDOW_SIZE:]))
    metrics["ts"]["cum_regret"].append(ts_total_regret)
    metrics["ts"]["cum_reward"].append(ts_total_reward)
    
    if e > WINDOW_SIZE:
        metrics["ts"]["exploration"].append(np.std(ts_success_history[-WINDOW_SIZE:]) * 1.5)
    else:
        metrics["ts"]["exploration"].append(0.5)

print("Simulation complete. Generating professional plots and report...")

# ============================================================
# PLOTTING (TS=BLUE, EPS=RED)
# ============================================================
plt.style.use('bmh')
plt.rcParams.update({'font.size': 12, 'axes.titlesize': 16, 'axes.labelsize': 14})

# 1. Learning Curve (Accuracy)
plt.figure(figsize=(10, 6))
plt.plot(metrics["eps"]["rolling_acc"], label="Epsilon-Greedy (Red)", alpha=0.9, color='red', linewidth=2)
plt.plot(metrics["ts"]["rolling_acc"], label="Thompson Sampling (Blue)", alpha=0.9, color='blue', linewidth=2)
plt.axhline(y=0.95, color='gray', linestyle='--', alpha=0.5, label="Target Accuracy")
plt.title("Algorithm Convergence: Local Accuracy", fontweight='bold')
plt.xlabel("Episodes")
plt.ylabel(f"Accuracy (Rolling {WINDOW_SIZE})")
plt.grid(True, linestyle='--', alpha=0.7)
plt.legend(frameon=True, loc='lower right')
plt.ylim(0, 1.05)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "accuracy_comparison.png"), dpi=300)

# 2. Cumulative Reward
plt.figure(figsize=(10, 6))
plt.plot(metrics["eps"]["cum_reward"], label="Epsilon-Greedy", color='red', linewidth=2)
plt.plot(metrics["ts"]["cum_reward"], label="Thompson Sampling", color='blue', linewidth=2)
plt.title("Cumulative Reward Comparison", fontweight='bold')
plt.xlabel("Episodes")
plt.ylabel("Total Accumulated Reward")
plt.grid(True, linestyle='--', alpha=0.7)
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "cumulative_reward.png"), dpi=300)

# 3. Cumulative Regret
plt.figure(figsize=(10, 6))
plt.plot(metrics["eps"]["cum_regret"], label="Epsilon-Greedy", color='red', linewidth=2)
plt.plot(metrics["ts"]["cum_regret"], label="Thompson Sampling", color='blue', linewidth=2)
plt.title("Cumulative Regret Comparison", fontweight='bold')
plt.xlabel("Episodes")
plt.ylabel("Total Regret (Lower is Better)")
plt.grid(True, linestyle='--', alpha=0.7)
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "cumulative_regret.png"), dpi=300)

# 4. Exploration Strategy
plt.figure(figsize=(10, 6))
plt.plot(metrics["eps"]["exploration"], label="Epsilon Decay (EPS)", color='red', linestyle='-', linewidth=2)
plt.plot(metrics["ts"]["exploration"], label="Uncertainty Proxy (TS)", color='blue', linestyle='--', alpha=0.6)
plt.title("Exploration vs. Exploitation Dynamics", fontweight='bold')
plt.xlabel("Episodes")
plt.ylabel("Exploration Intensity")
plt.grid(True, linestyle='--', alpha=0.7)
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "exploration_exploitation.png"), dpi=300)

# ============================================================
# SAVE NUMERICAL RESULTS
# ============================================================
results_summary = {
    "total_episodes": EPISODES,
    "final_accuracy_eps": float(metrics["eps"]["rolling_acc"][-1]),
    "final_accuracy_ts": float(metrics["ts"]["rolling_acc"][-1]),
    "final_regret_eps": float(metrics["eps"]["cum_regret"][-1]),
    "final_regret_ts": float(metrics["ts"]["cum_regret"][-1]),
    "total_reward_eps": float(metrics["eps"]["cum_reward"][-1]),
    "total_reward_ts": float(metrics["ts"]["cum_reward"][-1])
}

with open(os.path.join(OUTPUT_DIR, "simulation_results.json"), "w") as f:
    json.dump(results_summary, f, indent=4)

with open(os.path.join(OUTPUT_DIR, "results_summary.txt"), "w") as f:
    f.write("="*50 + "\n")
    f.write("        RESEARCH SIMULATION FINAL RESULTS\n")
    f.write("="*50 + "\n")
    f.write(f"Total Episodes     : {EPISODES}\n")
    f.write(f"Epsilon-Greedy Acc : {results_summary['final_accuracy_eps']*100:.2f}%\n")
    f.write(f"Thompson Samp. Acc : {results_summary['final_accuracy_ts']*100:.2f}%\n")
    f.write(f"Final Regret (EPS) : {results_summary['final_regret_eps']:.2f}\n")
    f.write(f"Final Regret (TS)  : {results_summary['final_regret_ts']:.2f}\n")
    f.write(f"Total Reward (EPS) : {results_summary['total_reward_eps']:.2f}\n")
    f.write(f"Total Reward (TS)  : {results_summary['total_reward_ts']:.2f}\n")
    f.write("="*50 + "\n")

print("\n" + "="*50)
print("             RESEARCH SIMULATION SUMMARY")
print("="*50)
print(f"Total episodes : {EPISODES}")
print(f"Final Accuracy (EPS) : {results_summary['final_accuracy_eps']*100:.2f}%")
print(f"Final Accuracy (TS)  : {results_summary['final_accuracy_ts']*100:.2f}%")
print(f"Final Regret (EPS)   : {results_summary['final_regret_eps']:.2f}")
print(f"Final Regret (TS)    : {results_summary['final_regret_ts']:.2f}")
print(f"All outputs saved to: {os.path.abspath(OUTPUT_DIR)}")
print("="*50 + "\n")