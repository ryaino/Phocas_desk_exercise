import { MockedProvider } from '@apollo/client/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { assert, describe, expect, it } from 'vitest';
import { DELETE_TEAM, REMOVE_MEMBER, TEAM_QUERY } from '../queries/teams';
import { mock } from '../testUtil';
import TeamsPage from './TeamsPage';

const mocks = [
  mock(
    TEAM_QUERY,
    {},
    {
      teams: [
        {
          id: '3',
          name: 'A team',
          members: [
            {
              id: '1',
              name: 'John',
              __typename: 'Person',
            },
            {
              id: '2',
              name: 'Sam',
              __typename: 'Person',
            },
          ],
          __typename: 'Team',
        },
        {
          id: '4',
          name: 'B team',
          members: [],
          __typename: 'Team',
        },
      ],
    },
  ),
  mock(DELETE_TEAM, { id: '3' }, { deleteTeam: { id: '3', __typename: 'Team' } }),
  mock(
    REMOVE_MEMBER,
    { teamId: '3', memberToRemove: '1' },
    {
      removeMember: {
        id: '3',
        name: 'A team',
        members: [
          {
            id: '2',
            name: 'Sam',
            __typename: 'Person',
          },
        ],
        __typename: 'Team',
      },
    },
  ),
];

describe('TeamsPage', () => {
  it('renders list', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <TeamsPage />
      </MockedProvider>,
    );

    const names = await screen.findAllByTestId('name');
    expect(names).toHaveLength(2);
    expect(names[0].querySelector('input')).toHaveValue('A team');
    expect(names[1].querySelector('input')).toHaveValue('B team');
  });

  it('test delete', async () => {
    const container = render(
      <MockedProvider mocks={mocks}>
        <TeamsPage />
      </MockedProvider>,
    );

    const deletes = await container.findAllByTestId('delete');
    expect(deletes).toHaveLength(2);

    const user = userEvent.setup();

    await user.click(deletes[0]);

    const names = await container.findAllByTestId('name');

    expect(names).toHaveLength(1);

    expect(names[0].querySelector('input')).toHaveValue('B team');
  });

  it('test member removal', async () => {
    const container = render(
      <MockedProvider mocks={mocks}>
        <TeamsPage />
      </MockedProvider>,
    );

    const members = await container.findAllByTestId('memberName');
    expect(members).toHaveLength(2);
    const button = members[0].querySelector('svg');

    if (button === null) {
      assert.fail('Delete button not found on member');
    } else {
      const user = userEvent.setup();

      await user.click(button);

      const updatedMembers = await container.findAllByTestId('memberName');
      expect(updatedMembers).toHaveLength(1);
      expect(updatedMembers[0].querySelector('span')?.innerText).toBe('Sam');
    }
  });
});
