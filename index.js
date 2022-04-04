const core = require('@actions/core');
const github = require('@actions/github');

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

    const labels = body.split('\n').reduce((acc, curr, currentIndex, array) => {
        if (curr.includes("Which teams are related") || curr.includes("Is it a team issue or a project issue")) {
            if (!Array.isArray(acc))
            // Adds "team" to the beginning of the label if it is a team, replaces spaces with dashes
                return array[currentIndex+2].split(',').map((label) => 
                    ((label.includes("Project issue") || label.includes("Team issue") ? "" : "team/" ) + label.trim().toLowerCase().replace(/ /g, '-')));
            else {
            // Adds "team" to the beginning of the label if it is a team, replaces spaces with dashes
                array[currentIndex+2].split(',').forEach((label) => acc.push(                    
                    ((label.includes("Project issue") || label.includes("Team issue") ? "" : "team/" ) + label.trim().toLowerCase().replace(/ /g, '-'))));
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
        if (current.includes('- [x]')) 
            // Adds "team" to the beginning of the label if it is a team, replaces spaces with dashes
            previous.push( (current.includes("project pr") || current.includes("team pr") ? "" : "team/" ) + current.replace('- [x]', '').trim().replace(/ /g, '-'));
        
        return previous;
    }, []);
}

const addLabels = (labels, requestBody, number) => {
    if (labels) {
        client.rest.issues.addLabels({
            ...requestBody,
            issue_number: number,
            labels
        });
    }
}

const parsePRBody = (body) => {
    const lines = body.split('\n');
    return lines.slice(1, 11).map(line => line.trim().toLowerCase());
}

const removeHead = (requestBody, number, finalBody) => {
    client.rest.issues.update({
        ...requestBody,
        issue_number: number,
        body: finalBody
    });
}

try {
    const issueBody = getIssueBody(github.context)
    const prBody = getPullRequestBody(github.context);
    const body = issueBody || prBody;

    if (body) {
        let labels;
        let requestBody;
        let finalBody;
        let number;
        
        if (issueBody) {
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

        addLabels(labels, requestBody, number);
        removeHead(requestBody, number, finalBody);
    } else {
        core.setFailed("No body found");
    }
} catch (error) {
    core.setFailed(error.message);
}
