// src/utils/analyticsEngine.js

/**
 * Calculates if the time spent was Fast, Slow, or Balanced.
 * "Fast" is < 50% of expected time.
 * "Slow" is > 150% of expected time.
 */
function getSpeedCategory(timeSpent, expectedTime) {
  // Fallback to 20 seconds if for some reason the DB document is missing it
  const expected = expectedTime || 20; 
  if (timeSpent < expected * 0.5) return 'FAST';
  if (timeSpent > expected * 1.5) return 'SLOW';
  return 'BALANCED';
}

export function generateExerciseAnalytics(questions) {
  if (!questions || questions.length === 0) return null;

  const totalQuestions = questions.length;
  let correctCount = 0;
  let totalTimeSpent = 0;
  let firstAttemptCorrect = 0;
  let secondAttemptCorrect = 0;

  // Behavior Trackers
  const behaviors = {
    fastAndWrong: 0,
    slowAndCorrect: 0,
    slowAndWrong: 0,
    fastAndCorrect: 0,
    changedToWrong: 0,
    changedToCorrect: 0,
    noChangeCorrect: 0,
    noChangeWrong: 0,
  };

  const topicStats = {};

  // 1. 🔄 PROCESS EVERY QUESTION
  questions.forEach((q) => {
    const timeSpent = q.timeSpentSec || 0;
    
    // Read the expected time directly from your database document
    const expectedTime = q.expectedTime || q.expectedTimeSec; 
    const speedCat = getSpeedCategory(timeSpent, expectedTime); 
    
    totalTimeSpent += timeSpent;

    // Topic Aggregation
    if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0, correct: 0, time: 0 };
    topicStats[q.topic].total += 1;
    topicStats[q.topic].time += timeSpent;

    if (q.isCorrect) {
      correctCount++;
      topicStats[q.topic].correct += 1;
      
      if (q.attemptsNeeded === 1) firstAttemptCorrect++;
      if (q.attemptsNeeded === 2) secondAttemptCorrect++;

      if (speedCat === 'FAST') behaviors.fastAndCorrect++;
      if (speedCat === 'SLOW') behaviors.slowAndCorrect++;

      if (q.changedAnswer) behaviors.changedToCorrect++;
      else behaviors.noChangeCorrect++;
    } else {
      if (speedCat === 'FAST') behaviors.fastAndWrong++;
      if (speedCat === 'SLOW') behaviors.slowAndWrong++;

      if (q.changedAnswer) behaviors.changedToWrong++;
      else behaviors.noChangeWrong++;
    }
  });

  const accuracy = correctCount / totalQuestions;
  const avgTimePerQuestion = totalTimeSpent / totalQuestions;

  // 2. 🎭 DETERMINE BEHAVIOR BADGE (Persona)
  let earnedBadge = null;
  
  if (behaviors.fastAndCorrect >= totalQuestions * 0.5) {
    earnedBadge = { id: "sharpshooter", name: "Sharpshooter", icon: "🎯", desc: "Fast and highly accurate." };
  } else if (behaviors.fastAndWrong >= totalQuestions * 0.4) {
    earnedBadge = { id: "speedster", name: "Speedster", icon: "⚡", desc: "Fast, but error-prone. Slow down!" };
  } else if (behaviors.slowAndCorrect >= totalQuestions * 0.5) {
    earnedBadge = { id: "thinker", name: "Thinker", icon: "🧠", desc: "Accurate, but takes time." };
  } else if (behaviors.changedToWrong >= totalQuestions * 0.3) {
    earnedBadge = { id: "overthinker", name: "Overthinker", icon: "🤯", desc: "Changed correct answers to wrong ones." };
  } else if (behaviors.fastAndWrong + behaviors.noChangeWrong >= totalQuestions * 0.5) {
    earnedBadge = { id: "guesser", name: "Guesser", icon: "🎲", desc: "Low time spent + incorrect answers." };
  } else {
    earnedBadge = { id: "balanced", name: "Balanced Student", icon: "⚖️", desc: "Steady pace and steady accuracy." };
  }

  // 3. 🧠 GENERATE SMART INSIGHTS
  const generatedInsights = [];

  // Speed vs Accuracy Insights
  if (behaviors.fastAndWrong >= 2) generatedInsights.push({ type: "warning", text: "⚡ You’re rushing—slow down and think before answering." });
  if (behaviors.slowAndCorrect >= 2) generatedInsights.push({ type: "success", text: "🎯 Careful Thinking! You’re accurate, but try to improve speed." });
  if (behaviors.slowAndWrong >= 2) generatedInsights.push({ type: "danger", text: "🤯 You’re spending a lot of time but still unsure. Revise these topics." });
  if (behaviors.fastAndCorrect >= 2) generatedInsights.push({ type: "success", text: "🧠 Mastery! You know this material extremely well." });

  // Answer Behavior Insights
  if (behaviors.changedToWrong > 1) generatedInsights.push({ type: "warning", text: "😵 You changed a correct answer—trust your first instinct." });
  if (behaviors.changedToCorrect > 1) generatedInsights.push({ type: "success", text: "🔄 Nice recovery! You caught your mistakes." });

  // Attempt Insights 
  if (secondAttemptCorrect > firstAttemptCorrect) generatedInsights.push({ type: "info", text: "📈 You rely on second attempts. Take a breath before your first click." });

  // Weak Topic Recommendation
  let weakestTopic = null;
  let lowestAcc = 1;
  Object.keys(topicStats).forEach(topic => {
    const acc = topicStats[topic].correct / topicStats[topic].total;
    if (acc < lowestAcc) {
      lowestAcc = acc;
      weakestTopic = topic;
    }
  });

  if (weakestTopic && lowestAcc <= 0.6) {
    const formattedTopic = weakestTopic.replace('_', ' ').toUpperCase();
    generatedInsights.push({ type: "action", text: `📉 Recommendation: Focus your next session on ${formattedTopic}.` });
  }

  // Sort by priority (warnings/dangers first) and take the top 3
  const priorityOrder = { danger: 1, warning: 2, action: 3, success: 4, info: 5 };
  generatedInsights.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
  const topInsights = generatedInsights.slice(0, 3);

  // 4. 📦 RETURN FINAL PAYLOAD
  return {
    overview: {
      score: correctCount,
      total: totalQuestions,
      accuracyPercentage: Math.round(accuracy * 100) || 0,
      totalTimeSec: totalTimeSpent,
      avgTimePerQuestion: Math.round(avgTimePerQuestion) || 0,
    },
    topicBreakdown: topicStats,
    badge: earnedBadge,
    smartInsights: topInsights,
    rawBehaviors: behaviors 
  };
}