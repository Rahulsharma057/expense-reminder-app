// Default message pool per category. Users can add their own custom
// messages too (stored in MessageTemplate) — both are combined at send time.
module.exports = {
  Motivation: [
    "Every small step counts — keep going.",
    "You're doing better than you think.",
    "Progress, not perfection.",
    "Today is a good day to try again.",
    "Discipline beats motivation — show up anyway.",
  ],
  Career: [
    "Your hard work is noticed, even when it doesn't feel like it.",
    "One good decision today compounds for years.",
    "Keep learning — it's your biggest edge.",
    "Consistency at work beats occasional brilliance.",
  ],
  Romantic: [
    "Thinking of you right now. 💜",
    "You make ordinary days feel special.",
    "Just a reminder that you're loved.",
    "Can't stop smiling thinking about you.",
  ],
  Flirt: [
    "Hey you 😏 just checking in.",
    "You've been on my mind all day.",
    "Careful, that smile of yours is dangerous.",
    "Miss you already.",
  ],
  Compliment: [
    "You handle things with more grace than you realize.",
    "Your energy makes a difference to the people around you.",
    "You're sharper than you give yourself credit for.",
    "The way you show up for people is rare.",
  ],
  Shayari: [
    "Waqt badal jaata hai, par kuch pal hamesha yaad rehte hain.",
    "Mehnat itni khamosh ho, ke safalta shor macha de.",
    "Raaste mushkil the, par himmat kabhi kam nahi hui.",
  ],
  Festival: [
    "Wishing you a day full of good moments!",
    "Hope today brings something worth celebrating.",
  ],
};

module.exports.ALL_CATEGORIES = Object.keys(module.exports);