/* eslint-env mocha */
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('Git hooks', () => {
    it('pre-commit hook contains unstaged/untracked checks', () => {
        const hookPath = path.join(__dirname, '..', '..', '.husky', 'pre-commit');
        const content = fs.readFileSync(hookPath, 'utf-8');
        expect(content).to.match(/unstaged changes/);
        expect(content).to.match(/untracked files/);
    });
});
