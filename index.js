const core = require('@actions/core');
const github = require('@actions/github');

let requestBody;
let finalBody;
let number;

const githubToken = core.getInput("github_token");
const client = github.getOctokit(githubToken);

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

const parseTaskList = (taskList) => {
    return taskList.reduce((previous, current) => {
        if (current.includes('- [x]')) {
            previous.push(current.replace('- [x]', '').trim());
        }
        return previous;
    }, []);
}

const addLabels = (labels) => {
    if ( labels ) {
        client.rest.issues.addLabels({
            ...requestBody,
            issue_number: number,
            labels
        });
    }
}

const parsePRBody = (body) => {
    const lines = body.split('\n');
    return [
    lines[3].trim().toLowerCase(), 
    lines[4].trim().toLowerCase(), 
    lines[7].trim().toLowerCase(), 
    lines[8].trim().toLowerCase(), 
    lines[9].trim().toLowerCase(), 
    lines[10].trim().toLowerCase(), 
    lines[11].trim().toLowerCase()];
}

const removeHead = (issue = true) => {
    if ( issue ) {
        client.rest.issues.update({
            ...requestBody,
            issue_number: number,
            body: finalBody
        });
    } else {
        client.rest.pulls.update({
            ...requestBody,
            pull_number: number,
            body: finalBody
        });
    }
}

try {
    const issueBody = getIssueBody(github.context)
    const prBody = getPullRequestBody(github.context);
    const body = issueBody || prBody;

    if (body) {
        let labels;

        if ( issueBody ) {
            labels = findLabelsInBody(body);
            requestBody = {
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
            };

            number = github.context.issue.number;
            finalBody = body.split('\n').slice(8).join('\n'); 
        } else {
            console.log(`parsedBody : ${parsePRBody(prBody)}`);
            labels = parseTaskList(parsePRBody(prBody));
            requestBody = {
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
            };
            
            number = github.context.payload.pull_request.number;
            finalBody = body.split('\n').slice(12).join('\n');
        }

        addLabels(labels);
        removeHead();


    } else {
        core.setFailed("No body found");
    }
} catch (error) {
    core.setFailed(error.message);
}
