/**
 * Calculates Expected Time based on Question Type.
 */
function getExpectedTime(qType) {
  if (qType === 'kanji_draw') return 15;
  if (qType === 'text_input') return 12;
  if (qType === 'multiple_choice') return 10;
  return 8; // single_choice default
}

function getSpeedCategory(timeSpent, expectedTime) {
  if (timeSpent < expectedTime * 0.5) return 'FAST';
  if (timeSpent > expectedTime * 1.5) return 'SLOW';
  return 'BALANCED';
}

export function generateExerciseAnalytics(questions) {
  if (!questions || questions.length === 0) return null;

  const totalQuestions = questions.length;
  let correctCount = 0;
  let totalTimeSpent = 0;
  let totalPointsEarned = 0;
  let maxPossiblePoints = 0;

  // Global Behavior Trackers
  const behaviors = {
    fastAndWrong: 0, slowAndCorrect: 0, slowAndWrong: 0, fastAndCorrect: 0, balanced: 0,
    changedToCorrect: 0, changedToWrong: 0, noChangeCorrect: 0, blindGuess: 0, tooManyChanges: 0,
    firstTryCorrect: 0, secondTryCorrect: 0, wrongBothTries: 0,
    hesitatedOnCorrect: 0, lowHoverGuess: 0,
    highlyDistracted: 0, strategicSkips: 0, hintCrutch: 0
  };

  const topicStats = {};
  const processedQuestions = []; // We will store the augmented questions here

  // ==========================================
  // 1. 🔄 PROCESS EVERY QUESTION DOCUMENT
  // ==========================================
  questions.forEach((q) => {
    const isCorrect = q.isCorrect || false;
    const timeSpent = q.timeSpentInSeconds || 0;
    const changes = q.changeCount || 0;
    const changedAnswer = q.changedAnswer || false;
    const attempts = q.attempts || {};
    const hoverTime = q.hoverTime || {};
    const correctOptions = q.correctOptions || [];
    const points = q.pointsEarned || 0;
    const maxPoints = q.points || 4;
    const expectedTime = getExpectedTime(q.questionType);
    const speedCat = getSpeedCategory(timeSpent, expectedTime);

    // Advanced Fields
    const tabSwitches = q.tabSwitchedCount || 0;
    const focusLost = q.focusLostCount || 0;
    const hintUsed = q.hintViewed || false;
    const skippedInitially = q.wasSkippedInitially || false;
    const timeline = q.optionSelectionTimeline || [];

    totalTimeSpent += timeSpent;
    totalPointsEarned += points;
    maxPossiblePoints += maxPoints;

    // Topic Aggregation
    const topic = q.topic || 'Uncategorized';
    if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0, time: 0 };
    topicStats[topic].total += 1;
    topicStats[topic].time += timeSpent;

    // ==========================================
    // 🧬 PER-QUESTION ADVANCED ANALYSIS INJECTION
    // ==========================================
    let qInsights = [];
    
    // 1. Integrity Check
    if (tabSwitches > 0 || focusLost > 0) {
      qInsights.push({ type: 'danger', title: 'Focus Lost', desc: `You switched tabs or lost focus ${tabSwitches + focusLost} times during this question.`});
      behaviors.highlyDistracted++;
    }

    // 2. Strategy Check
    if (skippedInitially && isCorrect) {
      qInsights.push({ type: 'success', title: 'Strategic Return', desc: 'You skipped this initially and came back to get it right. Excellent time management!'});
      behaviors.strategicSkips++;
    } else if (skippedInitially && !isCorrect) {
      qInsights.push({ type: 'warning', title: 'Difficult Concept', desc: 'You skipped this and still struggled. Review this topic deeply.'});
    }

    // 3. Hint Usage
    if (hintUsed && isCorrect) {
      qInsights.push({ type: 'info', title: 'Hint Assisted', desc: 'You used a hint to get this correct. Try to solve it raw next time.'});
    } else if (hintUsed && !isCorrect) {
      qInsights.push({ type: 'danger', title: 'Ineffective Hint', desc: 'Even with the hint, you missed this. This is a critical weak point.'});
      behaviors.hintCrutch++;
    }

    // 4. Timeline/Hesitation Check
    if (timeline.length > 1 && q.firstResponseTime) {
      const timeToChange = q.lastResponseTime - q.firstResponseTime;
      if (timeToChange > (expectedTime * 0.5)) {
        qInsights.push({ type: 'warning', title: 'High Hesitation', desc: `You selected an answer at ${q.firstResponseTime}s, but spent ${timeToChange.toFixed(1)}s doubting yourself before your final choice.`});
      }
    }

    // Attach to the question object
    const augmentedQuestion = {
      ...q,
      advancedAnalysis: {
        speedCategory: speedCat,
        integrityScore: Math.max(0, 100 - (tabSwitches * 20) - (focusLost * 10)),
        perQuestionInsights: qInsights
      }
    };
    processedQuestions.push(augmentedQuestion);

    // ==========================================
    // 🎯 APPLYING GLOBAL MATRIX LOGIC
    // ==========================================
    if (isCorrect) {
      correctCount++;
      topicStats[topic].correct += 1;
      if (speedCat === 'FAST') behaviors.fastAndCorrect++;
      else if (speedCat === 'SLOW') behaviors.slowAndCorrect++;
      else behaviors.balanced++;

      if (changedAnswer) behaviors.changedToCorrect++;
      else behaviors.noChangeCorrect++;

      if (attempts.firstAttemptCorrect) behaviors.firstTryCorrect++;
      else if (attempts.secondAttemptCorrect) behaviors.secondTryCorrect++;
    } else {
      if (speedCat === 'FAST') behaviors.fastAndWrong++;
      else if (speedCat === 'SLOW') behaviors.slowAndWrong++;

      if (changedAnswer) behaviors.changedToWrong++;
      if (!changedAnswer && speedCat === 'FAST') behaviors.blindGuess++;
      if (!attempts.firstAttemptCorrect && !attempts.secondAttemptCorrect) behaviors.wrongBothTries++;

      let totalHoverTime = 0;
      let hoveredCorrectOption = false;
      Object.entries(hoverTime).forEach(([key, time]) => {
        totalHoverTime += time;
        if (correctOptions.includes(Number(key)) || correctOptions.includes(key)) {
          if (time > 0.5) hoveredCorrectOption = true;
        }
      });
      if (hoveredCorrectOption) behaviors.hesitatedOnCorrect++;
      if (totalHoverTime < 1 && speedCat === 'FAST') behaviors.lowHoverGuess++;
    }
    if (changes > 2) behaviors.tooManyChanges++;
  });

  const accuracy = correctCount / totalQuestions;
  const avgTimePerQuestion = totalTimeSpent / totalQuestions;

  // ==========================================
  // 2. 🎭 DETERMINE GLOBAL BEHAVIOR BADGE
  // ==========================================
  let earnedBadge = null;
  if (behaviors.highlyDistracted >= Math.max(2, totalQuestions * 0.2)) {
    earnedBadge = { id: "distracted", name: "Distracted", icon: "👀", desc: "High tab switching and focus loss. Stay in the zone!" };
  } else if (behaviors.fastAndWrong >= totalQuestions * 0.4) {
    earnedBadge = { id: "speedster", name: "Speedster", icon: "⚡", desc: "You answer fast, but errors slip through. Slow down!" };
  } else if (behaviors.fastAndCorrect >= totalQuestions * 0.5) {
    earnedBadge = { id: "sharpshooter", name: "Sharpshooter", icon: "🎯", desc: "Fast and flawlessly accurate. Pure mastery." };
  } else if (behaviors.slowAndCorrect >= totalQuestions * 0.5) {
    earnedBadge = { id: "thinker", name: "Thinker", icon: "🧠", desc: "Highly accurate, but you take your time analyzing." };
  } else if (behaviors.tooManyChanges >= Math.max(2, totalQuestions * 0.2) || behaviors.changedToWrong >= 2) {
    earnedBadge = { id: "overthinker", name: "Overthinker", icon: "🤯", desc: "You doubt yourself and change correct answers." };
  } else if (behaviors.blindGuess >= totalQuestions * 0.3 || behaviors.lowHoverGuess >= 2) {
    earnedBadge = { id: "guesser", name: "Guesser", icon: "🎲", desc: "Clicking without reading fully. Time to focus!" };
  } else {
    earnedBadge = { id: "balanced", name: "Tactician", icon: "⚖️", desc: "A perfectly balanced mix of speed and accuracy." };
  }

  // ==========================================
  // 3. 🧠 GENERATE GLOBAL SMART INSIGHTS
  // ==========================================
  const insights = [];
  if (behaviors.strategicSkips > 0) insights.push({ type: "success", text: "Great exam strategy! You skipped hard questions and successfully returned to them." });
  if (behaviors.hintCrutch > 1) insights.push({ type: "danger", text: "You are relying on hints but still missing questions. Deep review needed." });
  if (behaviors.fastAndWrong > 1) insights.push({ type: "warning", text: "You’re rushing—slow down and think before answering." });
  if (behaviors.slowAndCorrect > 1) insights.push({ type: "info", text: "Good job! You’re accurate, but try to improve speed." });
  if (behaviors.changedToWrong > 0) insights.push({ type: "danger", text: "You changed a correct answer—trust your first instinct." });

  const priorityOrder = { danger: 1, warning: 2, action: 3, success: 4, info: 5 };
  insights.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
  const topInsights = insights.slice(0, 4);

  // ==========================================
  // 4. 📦 RETURN FINAL PAYLOAD
  // ==========================================
  return {
    overview: {
      score: correctCount,
      total: totalQuestions,
      pointsEarned: totalPointsEarned,
      maxPoints: maxPossiblePoints,
      accuracyPercentage: Math.round(accuracy * 100) || 0,
      totalTimeSec: totalTimeSpent,
      avgTimePerQuestion: Math.round(avgTimePerQuestion) || 0,
    },
    topicBreakdown: topicStats,
    badge: earnedBadge,
    smartInsights: topInsights,
    rawBehaviors: behaviors,
    processedQuestions: processedQuestions // 🚨 This now contains all the deep analysis per question!
  };
}