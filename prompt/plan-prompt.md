# Table tennis application

You are tasked a complex that of creating web application for creating table tennis tournaments and tracking players MMR.
First plan the whole implementation process into multiple steps and execute step one by one.

## Technology

I have one specific requirement for application - it should be written with the react framework.
Suggest all other techlogies to be used in project that will cover:

- persisting data in relation SQL database
- creating modern UX for application using simple and intuitive libraries
- application user management

When developing application:

- provide a way to run application in development model
- provide a way to run all tests for application
- provide a way to build production docker image of application
- provide a way to run application in production setup using docker
- provide a way to format application code

See my previous question from conversation.

## Guidelines

- summarize application architecture in project's CLAUDE.md for future reference - describe used technologies, application structure and instruction to run and test application
- organize application in layers according to standards,
- organize application in re-usable components when possible,
- use all relevant react framework guidelines for organizing application code and structure
- remember to update infromation about application structure in CLAUDE.md
- create unit tests for your code
- introduce formatter and style checker for the project and use it when developing application

## Functionality

The application should be an application for tracking table tennis matches and tournaments between users of the application.

### User management

User should be able to:

- sign in freely
- log into the application
- log out from application
- reset password

### Free matches

Application should allow:

- providing results of the matches between two players outside of any tournament
- the result of the match should be affecting both players MMR rating (both standalone and tournament matches)
- user should be able to see a history of his/her matches - both played without a tournament and within specific tournament

Each match in application can be:

- enter by one of the opponent
- and, must be confirmed by the other opponent

### Tournaments

Application should allow to:

- create a new tournament by user
- register to the tournament for new users before it starts
- start a tournament and organize a matches for players
- enter the score of tournament match for current phase of tournament

Two types of tournaments should be handled:

- swiss
- tournament with group and elimation phases

## Application model

User should have following properties:

- username
- password
- mmr

Match should have:

- score
- reference to tournament if it is a tournament match of any stage

Tournamant should have:

- a type of tournament
- all matches of all stages with their results (design data model that covers it)
- a state:
  - OPEN - the tournament is open for player registration
  - LIVE - the tournament is in progress
  - FINISHED - once all matches are played

## Application views

Application should be a several main views:

- view for match list
  - should list the history of matches (standalone and tournament)
  - should allow to enter a standalone (outside of tournament) match
  - should allow to confirm the result of standalone match provided by oppponent
  - should display pending tournament matches
    - if opponent provides match results first then there should be option to confirm a result score
    - if opponent did not provide a result then there should be option to enter result than can be confirmed by other player
- view for tournament list
  - should allow to create a new tournament
  - should display list of current and past tournaments
- view for displaying tournament current results
  - should allow to display a tournament results depending on the tournament type
  - starting a tournament with already players that registered to tournament so far (if user is a creator)
  - register to tournament if it has not started yet (creator of tournament can register to tournament created by it)

## Other

Ask additional questions if needed.

Use local git repository for tracking changes in local. Commit your works after unit of work.
