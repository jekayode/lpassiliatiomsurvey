/**
 * LifePointe breakout teams — per-team wording.
 *
 * Everyone scans the same QR, lands on the group chooser, picks their team,
 * and answers that team's questions. Only the wording below changes per team;
 * the wizard structure, storage, and slides are identical.
 *
 * Each team:
 *   id         short slug (also the Google Sheet tab: Responses_<id>)
 *   name       shown on the chooser, form header, and presentation
 *   blurb      one line on the chooser card
 *   objective  the "Our objective" intro sentence
 *   overrides  optional per-step wording. Any field left out falls back to the
 *              Assimilation base wording in index.html. Editable steps:
 *                success : {title, helper, placeholder}
 *                journey : {title, stages:[...]}   (stages drive the gap chips)
 *                radical : {title}
 *                whatif  : {title, helper, chips:[...]}
 *
 * >>> EDIT ME: Missions wording is a best-guess placeholder; Discipleship and
 *     Life Groups currently inherit the base (Assimilation) wording. Replace the
 *     objectives, titles, journey stages, and what-if prompts with each team's
 *     real questions. <<<
 */
window.TEAMS = [
  {
    id: 'assimilation',
    name: 'Assimilation',
    blurb: 'Turning first-time guests into rooted, participating members.',
    objective: 'If we radically transformed assimilation across the network, what would be noticeably different about the way people move from being new to becoming connected, committed and actively participating members?',
    overrides: {} // uses the base wording
  },

  {
    id: 'missions',
    name: 'Missions',
    blurb: 'Building a church that is sold out to the Great Commission.',
    // EDIT ME
    objective: 'If we radically transformed missions across the network, what would be noticeably different about the way our people move from being aware, to burdened, to actively sent and giving toward the Great Commission?',
    overrides: {
      success: {
        title: 'What would a church truly sold out to Missions look like?',
        helper: 'Don\'t settle for "we support a few missionaries." When are we genuinely a missions-sent church?',
        placeholder: 'Describe it — what\'s true of a church that is sold out to missions…'
      },
      journey: {
        title: 'Where are the biggest gaps in the journey?',
        // EDIT ME — replace with the real missions pathway
        stages: ['Unaware', 'Aware', 'Burdened', 'Giving', 'Praying', 'Going', 'Mobilising']
      },
      radical: { title: 'What would radical transformation in Missions look like?' },
      whatif: {
        title: 'What if?',
        helper: 'No budget, manpower, or "we\'ve never done that" limits. Tap the ones that would change the game.',
        // EDIT ME
        chips: [
          'Every member has a personal part in the Great Commission',
          'Every campus sends and supports a missionary',
          'We can see exactly how the network is advancing missions',
          'Every new believer is discipled into a sending mindset',
          'Missions giving grows every single year',
          'Missions is owned by the whole church, not a department'
        ]
      }
    }
  },

  {
    id: 'discipleship',
    name: 'Discipleship',
    blurb: 'Forming reproducing disciples, not just attenders.',
    // EDIT ME
    objective: 'If we radically transformed discipleship across the network, what would be noticeably different about the way people move from being new believers to becoming mature, reproducing disciples?',
    overrides: {
      // EDIT ME — add success/journey/radical/whatif overrides for Discipleship
      success: { title: 'What does a fully-formed, reproducing disciple look like?' }
    }
  },

  {
    id: 'lifegroups',
    name: 'Life Groups',
    blurb: 'Where people are known, cared for, and grow together.',
    // EDIT ME
    objective: 'If we radically transformed Life Groups across the network, what would be noticeably different about the way people move from attending a service to belonging, growing, and leading in community?',
    overrides: {
      // EDIT ME — add success/journey/radical/whatif overrides for Life Groups
      success: { title: 'What does a thriving Life Group look like?' }
    }
  }
];
