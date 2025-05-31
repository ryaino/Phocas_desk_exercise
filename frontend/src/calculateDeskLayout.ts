import { DogStatus, type PeopleQuery } from './generated/graphql';

type Person = PeopleQuery['people'][0];
/**
 * requirements teams must sit together.
 * People who don't like dogs should be placed as far away from those who have dogs as possible.
 * People who have dogs should be placed as far apart as possible.
 * Preference to be given to people who would like to avoid dogs. See Example below
 * Desks are arranged in a single line of adjacent desks.
 * Teams sit next to each other, so the team boundary must be taken into account.
 *
 * For example, if given a single team of 5 people with the following preferences:
 * 1. Alice - likes dogs
 * 2. Bob - likes dogs
 * 3. Charlie - doesn't like dogs
 * 4. David - has a dog
 * 5. Eve - has a dog
 *
 * A valid desk layout would be:
 * Charlie(Avoid), Alice(Like), David(Has), Bob(Like), Eve(Has)
 *
 * If Bob left, then a new valid desk layout would be
 * Charlie(Avoid), Alice(Like), David(Has), Eve(Has)
 *
 * There is a test suite provided that is disabled in calculateDeskLayout.spec.ts
 * This test suite may not be exhaustive for all edge cases.
 */
export const calculateDeskLayout = (people: Person[]): Person[] => {
  if (people.length <= 2) return people;

  const teams = splitIntoTeams(people);
  const bestTeamLayouts = calculateBestLayouts(teams);

  /**
   * To guarantee the best possible outcome I could have brute forced literally every single combination
   * of teams against every combination of every other teams. As sort of a tradeoff I instead decided
   * to find the best possible layout within each team and then find the best combination of all those layouts.
   */
  const bestTeamLayoutsPermutations = addFlippedTeams(bestTeamLayouts);
  const possibleLayouts = generateLayouts(bestTeamLayoutsPermutations);
  const bestPossibleLayout = findBestLayout(possibleLayouts);

  return bestPossibleLayout;
};

function splitIntoTeams(people: Person[]): Map<string, Person[]> {
  const teams = new Map<string, Person[]>();

  for (const person of people) {
    //treat people without a team as a team of 1 instead of grouping them all together
    const teamId = person.team ? person.team.id : JSON.stringify(person);

    if (teams.has(teamId)) {
      teams.get(teamId)?.push(person);
    } else {
      teams.set(teamId, [person]);
    }
  }

  return teams;
}

function calculateBestLayouts(teams: Map<string, Person[]>): Map<string, Person[]> {
  const optimizedTeams = new Map<string, Person[]>();

  for (const teamId of teams.keys()) {
    const team = teams.get(teamId);
    if (team) {
      optimizedTeams.set(teamId, optimizeTeam(team));
    }
  }

  return optimizedTeams;
}

function optimizeTeam(people: Person[]): Person[] {
  if (people.length <= 2) return people;

  let bestLayout: Person[] = [];
  let bestLayoutScore = Number.NEGATIVE_INFINITY;

  const teamPermutations = generateTeamPermutations(people);

  for (const permutation of teamPermutations) {
    const score = calculateTeamScore(permutation);

    if (score > bestLayoutScore) {
      bestLayout = permutation;
      bestLayoutScore = score;
    }
  }
  return bestLayout;
}

function generateTeamPermutations(allPeople: Person[]): Person[][] {
  let permutations: Person[][] = [[]];

  for (const person of allPeople) {
    const currentPermutation: Person[][] = [];

    for (const permutation of permutations) {
      for (let i = 0; i <= permutation.length; i++) {
        const temp = [...permutation];
        temp.splice(i, 0, person);
        currentPermutation.push(temp);
      }
    }
    permutations = currentPermutation;
  }
  return permutations;
}

function calculateTeamScore(people: Person[]): number {
  let score = 0;
  let minAvoidDistance = null;
  let minHaveDistance = null;

  for (let i = 0; i < people.length - 1; i++) {
    for (let j = i + 1; j <= people.length - 1; j++) {
      const distance = j - i;

      if (oneAvoidOneHave(people[i], people[j])) {
        score -= people.length - distance;
        if (!minAvoidDistance) {
          minAvoidDistance = distance;
        } else if (distance < minAvoidDistance) {
          minAvoidDistance = distance;
        }
      }

      if (people[i].dogStatus === DogStatus.Have && people[j].dogStatus === DogStatus.Have) {
        score -= people.length - distance;
        if (!minHaveDistance) {
          minHaveDistance = distance;
        } else if (distance < minHaveDistance) {
          minHaveDistance = distance;
        }
      }
    }
  }

  if (minHaveDistance && minAvoidDistance && minAvoidDistance > minHaveDistance) {
    const distanceDifference = minAvoidDistance - minHaveDistance;
    score -= distanceDifference;
  }

  return score;
}

function oneAvoidOneHave(p1: Person, p2: Person) {
  return (
    (p1.dogStatus === DogStatus.Avoid && p2.dogStatus === DogStatus.Have) ||
    (p1.dogStatus === DogStatus.Have && p2.dogStatus === DogStatus.Avoid)
  );
}

function addFlippedTeams(teams: Map<string, Person[]>): Map<string, Person[][]> {
  const inclFlippedTeams = new Map<string, Person[][]>();

  teams.forEach((value, key) => {
    if (value.length === 1) {
      inclFlippedTeams.set(key, [value]);
    } else {
      inclFlippedTeams.set(key, [[...value], value.reverse()]);
    }
  });

  return inclFlippedTeams;
}

function generateLayouts(allTeamLayouts: Map<string, Person[][]>): Person[][] {
  let allLayouts: Person[][][] = [[[]]];

  for (const teamLayouts of allTeamLayouts.values()) {
    const incompleteLayouts = [...allLayouts];

    const layoutsWithTeamLayouts: Person[][][] = [];

    for (const layout of incompleteLayouts) {
      for (const teamLayout of teamLayouts) {
        for (let i = 0; i <= layout.length; i++) {
          const temp = [...layout];
          temp.splice(i, 0, teamLayout);
          layoutsWithTeamLayouts.push(temp);
        }
      }
      allLayouts = layoutsWithTeamLayouts;
    }
  }
  return allLayouts.map((layout) => layout.flat());
}

function findBestLayout(layouts: Person[][]): Person[] {
  let bestLayout: Person[] = [];
  let bestLayoutScore = Number.NEGATIVE_INFINITY;

  for (const permutation of layouts) {
    const score = calculateLayoutScore(permutation);

    if (score > bestLayoutScore) {
      bestLayout = permutation;
      bestLayoutScore = score;
    }
  }
  return bestLayout;
}

function calculateLayoutScore(people: Person[]): number {
  let score = 0;

  for (let i = 0; i < people.length - 1; i++) {
    for (let j = i + 1; j <= people.length - 1; j++) {
      const distance = j - i;

      if (oneAvoidOneHave(people[i], people[j])) {
        score -= people.length - distance;
      }

      if (people[i].dogStatus === DogStatus.Have && people[j].dogStatus === DogStatus.Have) {
        score -= people.length - distance;
      }
    }
  }
  return score;
}
