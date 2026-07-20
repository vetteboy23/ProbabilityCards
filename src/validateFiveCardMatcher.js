import { fullDeck } from "./cards.js";
import { builtInHands, selectableHands, HAND_EVALUATOR } from "./hands.js";
import { evaluateHand, evaluateAttendanceHands } from "./handEvaluator.js";
import {
  createFastFiveCardMatcher,
  createFiveCardProfile,
  maximumRepresentedPlayers,
} from "./fiveCardMatcher.js";
import { GAME_FORMAT } from "./setupRules.js";
import { PERSON } from "./people.js";

function seededRandom(seed = 123456789) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sampleHand(random) {
  const chosen = new Set();
  while (chosen.size < 5) chosen.add(Math.floor(random() * fullDeck.length));
  return [...chosen].map((index) => fullDeck[index]);
}

export function validateFiveCardMatchers({ samplesPerContext = 250 } = {}) {
  const checks = [];
  const failures = [];
  const random = seededRandom();
  const hands = [...builtInHands, ...selectableHands].filter(
    (hand) =>
      hand.evaluator !== HAND_EVALUATOR.STANDARD_POKER_CATEGORY &&
      hand.evaluator !== HAND_EVALUATOR.FIXED_SPECIFIC_CARD_PAIR_PROBABILITY
  );

  const contexts = [
    {
      label: "without virtual self",
      format: GAME_FORMAT.FIVE_CARD_DRAW,
      playerId: null,
      useVirtualSelf: false,
      selectedPlayerIds: [PERSON.SLEEPY, PERSON.STEAK, PERSON.BALL, PERSON.HAPPY, PERSON.LIGHT],
    },
    {
      label: "with Sleepy as virtual self",
      format: GAME_FORMAT.FIVE_CARD_DRAW,
      playerId: PERSON.SLEEPY,
      useVirtualSelf: true,
      selectedPlayerIds: [PERSON.SLEEPY, PERSON.STEAK, PERSON.BALL, PERSON.HAPPY, PERSON.LIGHT],
    },
  ];

  for (const context of contexts) {
    for (const hand of hands) {
      const fast = createFastFiveCardMatcher(hand, context);
      if (!fast) {
        failures.push(`${hand.id}: no fast matcher`);
        continue;
      }
      for (let sample = 0; sample < samplesPerContext; sample += 1) {
        const cards = sampleHand(random);
        const expected = evaluateHand(hand, cards, context).matched === true;
        const actual = fast(createFiveCardProfile(cards, context));
        if (actual !== expected) {
          failures.push(
            `${hand.id} ${context.label}: expected ${expected}, got ${actual} for ${cards
              .map((card) => card.id)
              .join(",")}`
          );
          break;
        }
      }
      checks.push(`✓ ${hand.id} matches the reference evaluator ${context.label}`);
    }

    for (let sample = 0; sample < samplesPerContext; sample += 1) {
      const cards = sampleHand(random);
      const profile = createFiveCardProfile(cards, context);
      const fastMaximum = maximumRepresentedPlayers(
        profile,
        context.selectedPlayerIds,
        context.useVirtualSelf
      );
      const expectedMaximum = evaluateAttendanceHands(cards, context).maximumRepresented;
      if (fastMaximum !== expectedMaximum) {
        failures.push(
          `attendance ${context.label}: expected ${expectedMaximum}, got ${fastMaximum} for ${cards
            .map((card) => card.id)
            .join(",")}`
        );
        break;
      }
    }
    checks.push(`✓ Attendance maximum matches the reference evaluator ${context.label}`);
  }

  return Object.freeze({
    valid: failures.length === 0,
    checks: Object.freeze(checks),
    failures: Object.freeze(failures),
    samplesPerContext,
    comparedHandCount: hands.length,
  });
}
