// src/utils/analyticsTopicTracker.js

/**
 * Analyzes the performance of specific topics across a set of questions.
 * @param {Array} questions - Array of question interaction objects.
 * @returns {Object} Structured data for charts and insight generation.
 */
export function analyzeTopics(questions) {
  if (!questions || questions.length === 0) return null;

  const rawTopicStats = {};
  let overallTotalTime = 0;

  // 1. Aggregate the raw data
  questions.forEach(q => {
    const topic = q.topic || 'General';
    const timeSpent = q.timeSpentSec || 0;
    
    overallTotalTime += timeSpent;

    if (!rawTopicStats[topic]) {
      rawTopicStats[topic] = {
        name: formatTopicName(topic), 
        totalAttempts: 0,
        correctCount: 0,
        totalTimeSec: 0
      };
    }

    rawTopicStats[topic].totalAttempts++;
    rawTopicStats[topic].totalTimeSec += timeSpent;

    if (q.isCorrect) {
      rawTopicStats[topic].correctCount++;
    }
  });

  // 2. Format data specifically for UI Charting Libraries (like Recharts)
  const radarChartData = [];
  const timeBarChartData = [];

  Object.values(rawTopicStats).forEach(stat => {
    const accuracy = stat.totalAttempts > 0 
      ? Math.round((stat.correctCount / stat.totalAttempts) * 100) 
      : 0;

    const avgTime = stat.totalAttempts > 0
      ? Math.round(stat.totalTimeSec / stat.totalAttempts)
      : 0;

    // Data format perfect for a Radar Chart (Strength vs Weakness)
    radarChartData.push({
      subject: stat.name,
      accuracy: accuracy,
      fullMark: 100
    });

    // Data format perfect for a Bar Chart (Time Management)
    timeBarChartData.push({
      subject: stat.name,
      avgTime: avgTime
    });
  });

  // 3. Identify Strengths and Weaknesses for the UI
  radarChartData.sort((a, b) => b.accuracy - a.accuracy);

  const strongestTopic = radarChartData.length > 0 ? radarChartData[0] : null;
  const weakestTopic = radarChartData.length > 0 ? radarChartData[radarChartData.length - 1] : null;

  return {
    rawStats: rawTopicStats,
    chartData: {
      radar: radarChartData,
      time: timeBarChartData
    },
    highlights: {
      strongest: strongestTopic,
      weakest: weakestTopic
    }
  };
}

/**
 * Helper: Converts raw database IDs like "kanji_reading" to "Kanji Reading"
 */
function formatTopicName(topicId) {
  if (!topicId) return 'Unknown Topic';
  return topicId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}