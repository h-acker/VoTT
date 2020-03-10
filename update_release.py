#!/usr/bin/python
"""Release manager script

This file should be used as post-commit in .git/hooks
It can be run with both python 2.7 and 3.6

Usage:
    commands.py [-q | -d]
    commands.py confirm [-q | -d]
    commands.py publish [-q | -d]
    commands.py check [--branch=BRANCH] [-q | -d]
    commands.py -h
    commands.py -v

Options:
    -h, --help       display this message and exit
    -v, --version    display version
    --branch=BRANCH  branch name to check for (default to master)
    -q, --quiet      set log level to WARNING (instead of INFO)
    -d, --debug      set log level to DEBUG (instead of INFO)
"""
import argparse
import logging
import os
import subprocess
import sys

from versions import __file__ as RELEASE_FILE, _build, _release, _version  # noqa; noqa

RELEASE_FILE = RELEASE_FILE.replace('pyc', 'py')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# handle case where the script is used as a git hook
if BASE_DIR.endswith('hooks'):
    BASE_DIR = os.path.abspath(os.path.sep.join([BASE_DIR, '..', '..']))
    sys.path.append(BASE_DIR)


def set_logging_config(quiet=False, debug=False):
    """
    Set logging with the 'good' level

    Arguments keywords:
    kwargs -- list containing parameters passed to script
    """
    # set up level of logging
    level = logging.INFO
    if quiet:
        level = logging.WARNING
    elif debug:
        level = logging.DEBUG

    # set up logging to console
    logging.basicConfig(format='%(levelname)s - %(funcName)s - %(message)s')
    logger = logging.getLogger()
    logger.setLevel(level)


def add_git():
    try:
        subprocess.check_output(["git", "add", "versions.py"], cwd=BASE_DIR)
    except Exception as err:
        raise SystemExit("Couldn't run git add: %s" % err)


def get_versions():
    # get build and release numbers from git
    try:
        suitcase_release = parse_git_release(_version)
        git_release = parse_git_release(
            subprocess.check_output(
                ["git", "describe", "--tags", "--match", "[0-9]*"], cwd=BASE_DIR
            )
            .decode('utf-8')
            .strip()
        )
        return (git_release, suitcase_release)
    except Exception as err:
        logging.warning(
            "No access to git, using suitcase release instead of git release: %s", err
        )
        return (suitcase_release, suitcase_release)


def parse_git_release(release_str):
    try:
        version, index, sha = release_str.split('-')
        return version
    except ValueError:
        return release_str


def compute():
    logging.debug("Updating versions...")
    # get build and release numbers from git
    try:
        build = (
            subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=BASE_DIR)
            .decode('utf-8')
            .strip()
        )

        release = (
            subprocess.check_output(
                ["git", "describe", "--tags", "--match", "[0-9]*"], cwd=BASE_DIR
            )
            .decode('utf-8')
            .strip()
        )
    except Exception as err:
        logging.warning(
            "Using previous build & release, since git does not seem available: %s", err
        )
        release = _release
        build = _build

    # compute version from release
    try:
        # get last release & version
        release_version = list(map(int, release.split('-')[0].split('.')))
        candidate_version = list(map(int, _version.split('-')[0].split('.')))
        # nothing to do if candidate_version is already more than release
        if candidate_version > release_version:
            logging.debug("version already set to %s. not changing it", candidate_version)
            version = _version
        # increment and convert back in strings, with suffic -rc
        else:
            logging.debug("incrementint version from release %s", release_version)
            major, minor, patch = release_version
            version = '.'.join(map(str, [major, minor, patch + 1])) + "-rc"
    except Exception as err:
        logging.error(err)
        version = _version

    logging.info("will set _version=%s", version)
    logging.info("will set _build=%s", build)
    logging.info("will set _release=%s", release)

    # update file
    with open(RELEASE_FILE, 'w') as output:
        content = """# flake8: noqa
# This file is autognerated by post-commit hook

# the release comes from git and should not be modified
# => read-only
_release = '{0}'

# you can set the next version number manually
# if you do not, the system will make sure that version > release
# => read-write, >_release
_version = '{1}'

# the build number will generate conflicts on each PR merge
# just keep yours every time
# => read-only
_build = '{2}'""".format(
            release, version, build
        )
        output.write(content)


# pylint:disable=E0602
try:
    input = raw_input  # noqa
except:  # noqa
    pass  # noqa


def confirm_release():
    answer = ""
    while answer not in ["y", "n"]:
        answer = input("OK to push to continue [y/n]? ").lower()
    if answer != "y":
        raise SystemExit("Please confirm version number to continue")


def confirm_push():
    try:
        branch = (
            subprocess.check_output(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=BASE_DIR
            )
            .decode('utf-8')
            .strip()
        )
        print("\nYou are on branch '{}'".format(branch))
        print("on version        '{}'".format(_version))
        print("\nType [y] to comfirm push")
        answer = input("or any other key to abort:").lower()
        if answer != "y":
            raise SystemExit("Push aborted...")
    except Exception as err:
        logging.warning("Git does not seem available: %s", err)
        raise SystemExit("This command requires git")


def check_branch(expected='master'):
    try:
        current = (
            subprocess.check_output(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=BASE_DIR
            )
            .decode('utf-8')
            .strip()
        )
        if current != expected:
            raise SystemExit(
                "You are in {}, whereas expected branch is {}".format(current, expected)
            )
        logging.info("You are in {}".format(current))
    except Exception as err:
        logging.warning("Git does not seem available: %s", err)
        raise SystemExit("This command requires git")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        usage="""Release manager script

This file should be used as post-commit in .git/hooks
It can be run with both python 2.7 and 3.6"""
    )
    parser.add_argument("command", nargs='?', help="[confirm|check|compare]")
    parser.add_argument('--prod', action='store_true', help="used with command confirm")
    parser.add_argument(
        '--branch', default='master', help="used with command check_branch"
    )
    parser.add_argument('-v', '--version', action='store_true')
    parser.add_argument('-d', '--debug', action='store_true')
    parser.add_argument('-q', '--quiet', action='store_true')
    args = parser.parse_args()

    set_logging_config(quiet=args.quiet, debug=args.debug)
    logging.debug(args)

    # version needs to be print to output in order to be retrieved by Makefile
    if args.version:
        print(_version)
        raise SystemExit()
    if args.command == 'confirm':
        if args.prod:
            confirm_push()
        else:
            confirm_release()
    elif args.command == 'check':
        check_branch(expected=args.branch)
    elif args.command == 'compare':
        print(get_versions())
    else:
        compute()
        add_git()
