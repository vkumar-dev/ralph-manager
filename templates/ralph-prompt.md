# Ralph Agent Prompt

READ all of `prd.json` and `progress.txt`. Pick ONE task with `passes=false` 
(prefer highest-risk/highest-impact). Keep changes small: one logical 
change per commit. Update `prd.json` by setting `passes=true` and adding 
notes or steps as needed. Append a brief entry to `progress.txt` with 
what changed and why.

## Instructions

1. **Read Context**: Read the full PRD (`prd.json`) and progress log (`progress.txt`)
2. **Select Task**: Pick one incomplete task (passes=false), prefer highest-risk/highest-impact
3. **Implement**: Complete the task in the `codebase/` folder
4. **Test**: Run any available tests or validation
5. **Update PRD**: Set `passes=true` for the completed task, add notes
6. **Log Progress**: Append entry to `progress.txt` with what changed and why
7. **Commit**: Commit all changes together (PRD update + code changes)
8. **Wait**: Wait 5 minutes before next iteration

## Quality Bar

- ✅ Production-ready code
- ✅ Maintainable and clean
- ✅ Tests when appropriate
- ✅ Update `AGENTS.md` for critical learnings

## Completion

When ALL tasks complete:
1. Create `.ralph-done` file
2. Output: `<promise>COMPLETE</promise>`

## Constraints

- NEVER GIT PUSH (the manager handles syncing)
- ONLY COMMIT locally
- One task per iteration unless steps are GLARINGLY OBVIOUS
- Keep changes small and focused
