'use strict';

const lintLib = require('@commitlint/lint');
const config = require('@commitlint/config-conventional');
const core = require('@actions/core');
const github = require('@actions/github');

const lint = lintLib.default;
const rules = config.rules;

const validEvent = ['pull_request'];

async function run() {
  try {
    const token = core.getInput('github-token', { required: true });

    const octokit = new github.getOctokit(token);

    const {
      eventName,
      payload: {
        repository: repo,
        pull_request: pr
      }
    } = github.context;

    console.log({
      eventName,
      repo,
      pr
    });

    if (validEvent.indexOf(eventName) < 0) {
      core.error(`Invalid event: ${eventName}`);
      return;
    }

    const commits = await octokit.rest.pulls.listCommits({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: pr.number,
    });
    const reports = await Promise.all(commits.data.map(commit => lint(commit.commit.message, config.rules)));
    const output = [];
    let countErrors = 0;
    let countWarnings = 0;
    reports.forEach((report, i) => {
      const meta = commits.data[i];
      const { sha, commit } = meta;
      core.startGroup(`Commit "${commit.message}" ${sha.substring(0, 7)} (${commit.author.name} <${commit.author.email}> on ${commit.author.date})`);
      if (report.valid) {
        core.notice('OK');
      } else {
        report.errors.forEach(err => {
          core.error(`Rule '${err.name}': ${err.message} ("${commit.message}")`);
          countErrors++;
        });
        report.warnings.forEach(err => {
          core.warning(`Rule '${err.name}': ${err.message} ("${commit.message}")`);
          countWarnings++;
        });
      }
      output.push({
        sha,
        commit,
        report
      })
      core.endGroup();
    });

    core.setOutput('report', output);

    if (countErrors) {
      core.setFailed(`Action failed with ${countErrors} errors (and ${countWarnings} warnings)`);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

//
//
// // config.rules['references-empty'] = [2, 'never'];
//
// const validEvent = ['pull_request'];
//
// async function main() {
//   try {
//
//     const {
//       eventName,
//       payload: {
//         repository: repo,
//         pull_request: pr
//       }
//     } = github.context;
//
//     const token = core.getInput('github-token', {required: true});
//     const debug = core.getInput('debug');
//     const userAgent = core.getInput('user-agent');
//     const previews = core.getInput('previews');
//
//     const opts = {};
//     if (debug === 'true') {
//       opts.log = console;
//     }
//     if (userAgent != null) {
//       opts.userAgent = userAgent;
//     }
//     if (previews != null) {
//       opts.previews = previews.split(',');
//     }
//
//     if (validEvent.indexOf(eventName) < 0) {
//       core.error(`Invalid event: ${eventName}`);
//       return;
//     }
//
//     const github = getOctokit(token, opts);
//
//     const commits = await github.rest.pulls.listCommits({
//       owner: repo.owner.login,
//       repo: repo.name,
//       pull_number: pr.number,
//     })
//
//     console.log(commits);
//
//     core.setOutput('commits', JSON.stringify(commits.data))
//
//
//     // lint(`fix: bad bug
//     //
//     // fixes #243
//     // `, config.rules)
//     //   .then((report) =>
//     //     console.log(report)
//     //   );
//
//   } catch (error) {
//     core.setFailed(error.message)
//   }
// }
//
// main()