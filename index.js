const core = require('@actions/core');
const github = require('@actions/github');

const getPullRequestBody = (context) => {
    const { payload: { pull_request } } = context;
    
    if (!pull_request) {
        return null;
    }

    return pull_request.body;
}

const getIssueBody = (context) => {
    const { payload: { issue } } = context;

    if (!issue) {
        return null;
    }
    
    return issue.body;          
}

const findLabelsInBody = (body) => {
    if (!body) {
        return [];
    }

    const labels = body.split('\n').reduce( (acc, curr, currentIndex, array) => {
        console.log(`Current line: ${curr}`);
        console.log(`Current labels: ${acc}`);
        
        if ( curr.includes("Which teams are related") || curr.includes("Is it a team issue or a project issue")) {
            if ( !Array.isArray(acc) )
                return array[currentIndex+2].split(',').map( (label) => label.trim().toLowerCase());
            else {
                array[currentIndex+2].split(',').forEach( (label) => acc.push(label.trim().toLowerCase()));
                return acc;
            }
        } else {
            return acc;
        }
    }, []);

    return labels;
}

try {
    const githubToken = core.getInput("github_token");
    const client = github.getOctokit(githubToken);
    const body = getIssueBody(github.context) || getPullRequestBody(github.context);

    if (body) {
        const labels = findLabelsInBody(body);

        if (labels) {
            client.rest.issues.addLabels({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: github.context.issue.number,
                labels,
            });
        }

        client.rest.issues.update({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: github.context.issue.number,
            body: body.split('\n').slice(8).join('\n'), // remove the first 8 lines
        });
    } else {
        core.setFailed("No body found");
    }
} catch (error) {
    core.setFailed(error.message);
}
