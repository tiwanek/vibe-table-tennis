# E2E tests

Your task will be to write E2E test that checks the whole application flow.

Use suggested playwright framework.

Update CLAUDE.md with the information about how to run E2E tests manually.
And how to run a single specific E2E tests. Consider other changes required
for E2E tests to work - change scripts / setup according if needed.

I would like to have 3 E2E tests.

1. Standalone match test

Having to users, similuate in tests, users having a single standalone match.
Have one user to enter the result, and the second to confirm.
Check changes in match history and status of matches.
Check MMR changes.

2. Swiss tournament test

Having 8 players simulate whole tournament.
From one user creating a swiss tournament, by entering results round by round
up to the finish of the tournament.
Check expected tournament results after it is finished.

3. Group+elimination tournament test

Having 8 players simaulte whole tournament.
from one user creating a group+elimination tournament, by entering results for
each stages pu to the tournament end.
Check expected tournamet results.


