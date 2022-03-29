const core = require('@actions/core');
const github = require('@actions/github');

try {

    const githubToken = core.getInput("github_token");
    const client = github.getOctokit(githubToken);

    let bodyPullRequest = github.context.payload.pull_request?.body;
    let bodyIssue = github.context.payload.issue?.body;

    if ( bodyIssue || bodyPullRequest ) {

        let body = bodyIssue || bodyPullRequest;

        

        let labels = body.split('\n').reduce( (acc, curr, currentIndex, array) => {
            console.log(`Current line: ${curr}`);
            console.log(`Current labels: ${acc}`);
            if ( curr.includes("Which teams are related") ) {
                return [array[currentIndex+2].split(',').map( (label) => label.trim() ), ...acc];
            }
            else if ( curr.includes("Is it a team issue or a project issue") ) {
                return [array[currentIndex+2].split(',').map( (label) => label.trim() ), ...acc];
            }
            else return acc;
            }, []);

        if ( labels ) {
            client.rest.issues.addLabels({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: github.context.issue.number,
                labels
            });
        }
    }

    else {
        core.setFailed("No body found");
    }
    
} catch (error) {
    core.setFailed(error.message);
}