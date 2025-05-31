import { DogStatus, type PeopleQuery } from './generated/graphql';

type Person = PeopleQuery['people'][0];
const NO_TEAM_ID = 'none';

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
  if(people.length <= 2) return people

  const teams = splitIntoTeams(people);
  const bestTeamLayouts = calculateBestLayouts(teams);

  const bestLayout: Person[] = [];

  bestTeamLayouts.forEach((value) => {
    bestLayout.push(...value);
  })

  return bestLayout;
};

function splitIntoTeams(people: Person[]) : Map<string, Person[]> {
  const teams = new Map<string, Person[]>();

  people.forEach((person) => {

    const teamId = person.team ? person.team.id : NO_TEAM_ID;        

    if(teams.has(teamId)) {
      teams.get(teamId)?.push(person);
    } else {
      teams.set(teamId, [person])
    }
  })
  return teams;
}

function calculateBestLayouts(teams: Map<string, Person[]>): Map<string, Person[]> {
  const optimizedTeams = new Map<string, Person[]>();

  teams.keys().forEach(teamId => {
    if(teamId === NO_TEAM_ID) optimizedTeams.set(teamId, teams.get(teamId)!) // we'll do something else for people who don't have a team later
    optimizedTeams.set(teamId, optimizeTeam(teams.get(teamId)!))
  })

  return optimizedTeams;
}

function optimizeTeam(people: Person[]): Person[] {

  if(people.length <= 2) return people;

  let bestLayout: Person[] = [];
  let bestLayoutScore = Number.NEGATIVE_INFINITY;

  const teamPermutations = generatePermutations(people);
  teamPermutations.forEach(permutation => {
    const score = calculateScore(permutation);

    if (score > bestLayoutScore) {
            bestLayout = permutation;
            bestLayoutScore = score;
        }
  })

  return bestLayout;
}

function generatePermutations(allPeople: Person[]): Person[][] {
  let permutations: Person[][] = [[]];
  allPeople.forEach(( person ) => {
    const currentPermutation: Person[][] = [];

    permutations.forEach( permutation => {
      for(let i = 0; i <= permutation.length; i++) {
        const temp = [...permutation];
        temp.splice(i , 0, person);
        currentPermutation.push(temp);
      }
    })
    permutations = currentPermutation;
  })
  return permutations;
}

function calculateScore(people: Person[]): number {
  let score = 0;
  let minAvoidDistance = null;
  let minHaveDistance = null;

  for(let i = 0; i < people.length - 1; i++) {

    for(let j = i + 1; j <= people.length - 1; j++) {
        const distance = j - i;

      if(oneAvoidOneHave(people[i], people[j])) {
        score -= people.length - distance;
        if (!minAvoidDistance) {
          minAvoidDistance = distance;
        } else if(distance < minAvoidDistance) {
          minAvoidDistance = distance;
        }
      } 
      
      if (people[i].dogStatus === DogStatus.Have && people[j].dogStatus === DogStatus.Have) {
        score -= people.length - distance;
        if(!minHaveDistance){
          minHaveDistance = distance;
        } else if ( distance < minHaveDistance) {
          minHaveDistance = distance;
        }
      }
    }
  }

  if(minHaveDistance && minAvoidDistance && (minAvoidDistance > minHaveDistance)) {
    const distanceDifference = minAvoidDistance - minHaveDistance;
    score -= distanceDifference;
  }

  return score;
}

function oneAvoidOneHave(p1: Person, p2: Person) {
 return (p1.dogStatus === DogStatus.Avoid && p2.dogStatus === DogStatus.Have)
 || (p1.dogStatus === DogStatus.Have && p2.dogStatus === DogStatus.Avoid)
}