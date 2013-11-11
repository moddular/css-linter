
import re
import subprocess as sp

PATH_TO_LINT_SCRIPT = '~/repositories/git/css-linter/css.js'
PATH_TO_JS_LINT_SCRIPT = '~/repositories/git/css-linter/js.js'
ENVIRONMENT_BRANCHES = ['staging', 'test', 'platformdev', 'sandbox']

def open_process(command):
	return sp.Popen(command, shell=True, stdout=sp.PIPE)


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
	#run_process('for i in {1..10}; do say \'Fail\'; done')

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


def js_lint():
	git_result = run_process('git diff --cached --name-status')
	files_to_lint = [f.split('\t').pop() for f in git_result.split('\n') if not f.startswith('D') and f.endswith('.js')]

	if len(files_to_lint) == 0:
		return 0

	lint_process = open_process('%s --blame --files=%s' % (PATH_TO_JS_LINT_SCRIPT, ','.join(files_to_lint)))
	lint_result = read_process(lint_process)
	close_process(lint_process)

	if lint_process.returncode != 0:
		print lint_result
		chastise('Failed JavaScript linting, this commit has been rejected')

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
		
	reflog_pattern = re.compile(r'(?P<rev>[^\s]+).+?branch:\s+Created from\s+(?P<origin>.+)')
	
	# grab the last line from git reflog
	reflog = run_process('git reflog show %s' % branch).splitlines().pop()
	reflog_fail_message = 'Couldn\'t figure out origin branch from reflog %s' % (reflog)
	
	# assume the branch is invalid
	result = False
	
	matches = reflog_pattern.search(reflog)
	if matches:
		origin = matches.group('origin').strip()
		if origin == 'HEAD':
			# reflog doesn't name the branch explicitly, so we'll take it's parent and check if that can be found in master
			parent_contained_in = run_process('git branch --contains %s^' % matches.group('rev'))
			result = is_master_in_branch_list(parent_contained_in)
			if not result:
				print 'The branch point %s^ for %s was found in the following branches:\n\n%s\n' % (matches.group('rev'), branch, parent_contained_in)
			
		elif origin == 'refs/remotes/origin/' + branch:
			# we got the branch from the remote (assumed to be OK)
			result = True
		elif origin not in ENVIRONMENT_BRANCHES:
			# the branch was not created from an environment branch
			result = True
		else:
			print '%s was branched from %s' % (branch, origin)
	else:
		print reflog_fail_message
	
	if not result:
		chastise('It looks like this branch (%s) was NOT branched off master\nThis commit has been rejected\nDO NOT PUSH YOUR REPOSITORY!\nPlease seek help if you don\'t know how to fix this' % (branch))	
	
	return result
	
	
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

