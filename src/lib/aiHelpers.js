// src/lib/aiHelpers.js

export function findTaskByTitle(titleQuery, tasks) {
  if (!titleQuery || !tasks) return null;
  
  const normalized = titleQuery.toLowerCase().trim();
  
  // Exact match first
  let task = tasks.find(t => t.title.toLowerCase() === normalized);
  if (task) return task;
  
  // Partial match
  task = tasks.find(t => t.title.toLowerCase().includes(normalized));
  if (task) return task;
  
  // Fuzzy match (contains key words)
  const keywords = normalized.split(' ');
  task = tasks.find(t => 
    keywords.some(kw => kw.length > 2 && t.title.toLowerCase().includes(kw))
  );
  
  return task;
}

export function calculateTaskPriority(task, status, streaks, completions) {
  let score = 0;
  const streak = streaks[task.id] || 0;
  const isCompleted = completions.includes(task.id);
  
  if (isCompleted) return -1; // Already done
  
  // Time urgency
  if (status === 'overdue') score += 100;
  if (status === 'current') score += 80;
  if (status === 'upcoming') score += 60;
  
  // Streak risk bonus
  if (streak >= 30) score += 50;  // High-value streak
  else if (streak >= 7) score += 30;
  else if (streak >= 3) score += 15;
  
  // Time-based multiplier
  const now = new Date();
  const currentHour = now.getHours();
  if (currentHour >= 22) score *= 1.5; // End of day urgency
  
  return score;
}

export async function generateWeeklyReport(userId, tasks, streaks, supabase) {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Fetch week's completions
  const { data: weekCompletions } = await supabase
    .from('task_completions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_date', weekAgo.toISOString().split('T')[0]);
  
  if (!weekCompletions || tasks.length === 0) {
    return {
      overallRate: 0,
      bestHabit: null,
      worstHabit: null,
      longestStreak: 0,
      totalCompleted: 0,
      totalPossible: tasks.length * 7
    };
  }
  
  // Calculate per-task completion rate
  const taskStats = tasks.map(task => {
    const completedDays = weekCompletions.filter(c => c.task_id === task.id).length;
    const rate = (completedDays / 7) * 100;
    return {
      task,
      completedDays,
      rate,
      streak: streaks[task.id] || 0
    };
  });
  
  // Find best and worst performers
  const bestTask = taskStats.reduce((max, curr) => 
    curr.rate > max.rate ? curr : max, taskStats[0]
  );
  
  const worstTask = taskStats
    .filter(t => t.rate < 100) // Exclude perfect tasks
    .reduce((min, curr) => 
      curr.rate < min.rate ? curr : min, taskStats[0]
    );
  
  // Calculate overall rate
  const overallRate = (weekCompletions.length / (tasks.length * 7)) * 100;
  
  return {
    overallRate: Math.round(overallRate),
    bestHabit: bestTask?.task.title,
    bestRate: Math.round(bestTask?.rate || 0),
    worstHabit: worstTask?.task.title,
    worstRate: Math.round(worstTask?.rate || 0),
    longestStreak: Math.max(...Object.values(streaks)),
    totalCompleted: weekCompletions.length,
    totalPossible: tasks.length * 7
  };
}

export function generateCoachingMessage(report) {
  const { overallRate, bestHabit, worstHabit, longestStreak, bestRate } = report;
  
  let message = `📊 **Your Weekly Summary**\n\n`;
  
  // Performance assessment
  if (overallRate >= 90) {
    message += `🎉 **Outstanding!** ${overallRate}% completion rate this week!\n`;
  } else if (overallRate >= 70) {
    message += `✨ **Great job!** ${overallRate}% completion. You're building solid habits.\n`;
  } else if (overallRate >= 50) {
    message += `💪 **Good progress!** ${overallRate}% completion. There's room to grow!\n`;
  } else {
    message += `🌱 **Let's build momentum!** ${overallRate}% this week. Small steps lead to big changes.\n`;
  }
  
  // Highlight strengths
  if (bestHabit) {
    message += `\n✅ **Star Habit**: "${bestHabit}" at ${bestRate}% - Fantastic consistency!\n`;
  }
  
  // Constructive feedback
  if (worstHabit && worstHabit !== bestHabit) {
    message += `⚠️ **Needs Attention**: "${worstHabit}" - Try setting a specific time for this task.\n`;
  }
  
  // Streak celebration
  if (longestStreak >= 30) {
    message += `\n🔥 **Incredible!** Your longest streak is ${longestStreak} days! You're unstoppable!\n`;
  } else if (longestStreak >= 7) {
    message += `\n🔥 **Longest Streak**: ${longestStreak} days! Keep the momentum going!\n`;
  }
  
  // Actionable tip
  message += `\n💡 **Next Step**: Focus on consistency this week. Even small daily wins compound!`;
  
  return message;
}
