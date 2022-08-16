import * as core from '@actions/core';

import { git } from './git';
import { Project } from './project';

(async () => {
  try {
    // Load inputs
    const inputs = {
      projectRoot: core.getInput('project-root') || '.',
      workspace:   core.getInput('workspace', { required: true }),
      base:        core.getInput('base'),
      pattern:     core.getInput('pattern') || '**'
    };

    // Fetch base
    git.setup(inputs.projectRoot);

    if (inputs.base) {
      await git.fetch('origin', inputs.base, '--progress', '--depth=1')
    }

    // Get workspace
    const project = await Project.loadProject(inputs.projectRoot);
    const workspace = await project.getWorkspace(inputs.workspace);

    if (!workspace) {
      return core.setFailed(`Workspace ${inputs.workspace} not found.`);
    }

    // Build base ref for git diff
    const tags = await git.tags({ fetch: true });
    const isTag = tags.all.some(tag => tag === inputs.base);

    let baseRef = inputs.base;

    if (!isTag && inputs.base) {
      baseRef = `origin/${baseRef}`;
    }

    if (!isTag && !inputs.base) {
      baseRef = `HEAD^`;
    }

    // Test if affected
    if (await workspace.isAffected(baseRef, inputs.pattern)) {
      core.setOutput('affected', true);
      core.info(`Workspace ${inputs.workspace} affected`);
    } else {
      core.info(`Workspace ${inputs.workspace} not affected`);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
})();
