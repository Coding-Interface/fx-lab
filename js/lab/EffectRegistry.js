/**
 * EffectRegistry — every effect in the lab, organised two ways:
 *   GROUPS   what kind of effect it is (the sidebar sections, in teaching order)
 *   PURPOSES what it is for (the Games / Learning / Stories filter)
 */
class EffectRegistry {
  static GROUPS = [
    { id: 'foundations', title: 'Foundations', blurb: 'The motion basics every effect is built on.' },
    { id: 'particles', title: 'Particles & Elements', blurb: 'Sparks, fire, magic, celebrations and weather.' },
    { id: 'action', title: 'Action & Impact', blurb: 'Hits that feel heavy and readable.' },
    { id: 'rewards', title: 'Rewards & Progress', blurb: 'Show players what they earned and how far they have come.' },
    { id: 'feedback', title: 'Answer Feedback', blurb: 'Right, wrong and timed answers in quizzes and assessments.' },
    { id: 'cards', title: 'Cards & Collectibles', blurb: 'Flips, unlocks, reveals and packs.' },
    { id: 'story', title: 'Story & Scenes', blurb: 'Dialogue, feelings, titles, transitions and atmosphere.' }
  ];

  static PURPOSES = [
    { id: 'all', title: 'All' },
    { id: 'games', title: 'Games' },
    { id: 'learning', title: 'Learning' },
    { id: 'stories', title: 'Stories' }
  ];

  static list = [
    EasingLab,
    SparkBurst, ConfettiRain, MagicTrail, FireAndSmoke, PortalVortex, Fireworks, Weather,
    Shockwave, HitDamage,
    CoinFountain, StarRating, XPLevelUp, BadgeUnlock, ProgressMap, StreakCombo,
    CorrectAnswer, GentleRetry, QuizTimer,
    CardFlip, LockedUnlock, LegendaryReveal, PackOpening,
    TypewriterDialogue, EmotionBubbles, ChapterTitle, SceneTransitions, DayNight, Spotlight
  ];

  static get(id) {
    return EffectRegistry.list.find((e) => e.id === id) || EffectRegistry.list[0];
  }

  static group(id) {
    return EffectRegistry.GROUPS.find((g) => g.id === id) || EffectRegistry.GROUPS[0];
  }

  static matches(E, purpose) {
    return purpose === 'all' || E.tags.includes(purpose);
  }
}
