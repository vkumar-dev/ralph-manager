const git = require('simple-git');
const fs = require('fs');
const path = require('path');

/**
 * Git utility for Ralph Manager
 * Handles auto-commit and sync functionality
 */
class RalphGit {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.git = git(projectPath);
    }

    /**
     * Initialize git repository if not exists
     */
    async initRepo() {
        try {
            const isRepo = await this.git.checkIsRepo();
            if (!isRepo) {
                await this.git.init();
                console.log('Git repository initialized');
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current git status
     */
    async getStatus() {
        try {
            const status = await this.git.status();
            return { success: true, status };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Stage all changes
     */
    async stageAll() {
        try {
            await this.git.add('.');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Commit changes with message
     */
    async commit(message) {
        try {
            const result = await this.git.commit(message);
            return { success: true, commit: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Stage and commit in one step
     */
    async stageAndCommit(message) {
        try {
            await this.git.add('.');
            const result = await this.git.commit(message);
            return { success: true, commit: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Push to remote
     */
    async push(branch = null) {
        try {
            const status = await this.git.status();
            const currentBranch = branch || status.current;
            
            if (!currentBranch) {
                return { success: false, error: 'No current branch' };
            }

            await this.git.push('origin', currentBranch);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Pull from remote
     */
    async pull(branch = null) {
        try {
            const status = await this.git.status();
            const currentBranch = branch || status.current;
            
            if (!currentBranch) {
                return { success: false, error: 'No current branch' };
            }

            await this.git.pull('origin', currentBranch);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync: pull then push
     */
    async sync(branch = null) {
        try {
            const pullResult = await this.pull(branch);
            if (!pullResult.success) {
                return pullResult;
            }
            
            const pushResult = await this.push(branch);
            return pushResult;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get commit history
     */
    async getLog(limit = 10) {
        try {
            const log = await this.git.log({ maxCount: limit });
            return { success: true, log };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if remote is configured
     */
    async hasRemote() {
        try {
            const remotes = await this.git.getRemotes(true);
            return { success: true, hasRemote: remotes.length > 0, remotes };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Add remote
     */
    async addRemote(name, url) {
        try {
            await this.git.addRemote(name, url);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Create and checkout new branch
     */
    async createBranch(branchName) {
        try {
            await this.git.checkoutLocalBranch(branchName);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Checkout branch
     */
    async checkout(branchName) {
        try {
            await this.git.checkout(branchName);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current branch
     */
    async getCurrentBranch() {
        try {
            const status = await this.git.status();
            return { success: true, branch: status.current };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Ralph-specific: Commit task completion
     */
    async commitTaskCompletion(taskId, taskDescription, iteration) {
        const message = `[Ralph] Complete task ${taskId}: ${taskDescription} (Iteration ${iteration})`;
        return await this.stageAndCommit(message);
    }

    /**
     * Ralph-specific: Commit with auto-sync
     */
    async commitAndSync(message, shouldSync = true) {
        const commitResult = await this.stageAndCommit(message);
        
        if (!commitResult.success) {
            return commitResult;
        }

        if (shouldSync) {
            const hasRemote = await this.hasRemote();
            if (hasRemote.success && hasRemote.hasRemote) {
                return await this.sync();
            }
        }

        return commitResult;
    }

    /**
     * Get diff between working directory and last commit
     */
    async getDiff() {
        try {
            const diff = await this.git.diff();
            return { success: true, diff };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if there are uncommitted changes
     */
    async hasUncommittedChanges() {
        const status = await this.getStatus();
        if (!status.success) {
            return { success: false, error: status.error };
        }
        return { success: true, hasChanges: !status.status.isClean() };
    }
}

module.exports = RalphGit;
