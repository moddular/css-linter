
import re
import subprocess as sp

PATH_TO_LINT_SCRIPT = '/repositories/git/css-linter/css.js'
ENVIRONMENT_BRANCHES = ['staging', 'test', 'platformdev', 'sandbox']

def open_process(command):
	return sp.Popen(command, shell=True, stdout=sp.PIPE, executable='/bin/bash')


def close_process(process, message='Failed to close subprocess'):
	try:
		process.stdout.close()
	except IOError:
		print message


def read_process(process):
	return process.communicate()[0].strip('\n')


def run_process(command):
	process = open_process(command)
	result = read_process(process)
	close_process(process)
	return result


def chastise(message):
	lines = message.split('\n')
	max_length = max([len(line) for line in lines])
	border = '\x1b[5m+' + ((max_length + 2) * '-') + '+\x1b[25m'

	print border
	for line in lines:
		print '\x1b[5m|\x1b[25m \033[91m' + line + ((max_length - len(line)) * ' ') + '\033[0m \x1b[5m|\x1b[25m'
	print border
	run_process('for i in {1..10}; do say \'Fail\'; done')
	


def lint():
	git_result = run_process('git diff --cached --name-status')
	files_to_lint = [f.split('\t').pop() for f in git_result.split('\n') if not f.startswith('D') and f.endswith('.css')]

	if len(files_to_lint) == 0:
		return 0

	lint_process = open_process('%s --blame --files=%s' % (PATH_TO_LINT_SCRIPT, ','.join(files_to_lint)))
	lint_result = read_process(lint_process)
	close_process(lint_process)

	if lint_process.returncode != 0:
		print lint_result
		chastise('Failed CSS linting, this commit has been rejected')

	return lint_process.returncode


def is_master_in_branch_list(results):
	for branch in get_branch_list(results):
		if branch == 'master':
			return True
	return False


def get_branch_list(results):
	return [l.lstrip(' *') for l in results.splitlines()]


def get_current_branch():
	branch = run_process('git symbolic-ref HEAD')
	return branch[branch.rfind('/') + 1:]


def has_valid_branch_point(branch):
	if branch == 'master' or branch in ENVIRONMENT_BRANCHES:
		return True

	branches = get_branch_list(run_process('git branch'))

	revs_command = "diff -u <(git rev-list --first-parent %s --) <(git rev-list --first-parent %s --) | sed -ne 's/^ //p' | head -1"
	branch_test_command = 'git branch --contains %s'

	for environment_branch in ENVIRONMENT_BRANCHES:
		if environment_branch in branches:
			revision = run_process(revs_command % (branch, environment_branch))
			branches_with_commit = run_process(branch_test_command % (revision))
			if not is_master_in_branch_list(branches_with_commit):
				chastise('It looks like this branch (%s) was NOT branched off master\nThis commit has been rejected\nDO NOT PUSH YOUR REPOSITORY!\nPlease seek help if you don\'t know how to fix this' % (branch))	
				return False

	return True
	
def is_valid_merge():
	reflog = run_process('git reflog -n1')
	merge_pattern = re.compile(r'HEAD@\{0\}:\smerge\s(?P<branch_name>[^\s:]+):\s*(?P<merge_type>.+)')
	matches = merge_pattern.search(reflog)
	if matches:
		branch = matches.group('branch_name')
		if branch in ENVIRONMENT_BRANCHES:
			chastise('It looks like you merged %s into %s\nDO NOT PUSH YOUR REPOSITORY\nPlease seek help if you don\'t know how to fix this' % (branch, get_current_branch()))
			return False

	return True

