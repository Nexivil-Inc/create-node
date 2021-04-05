// @remove-file-on-eject
/**
 * origin: Copyright (c) 2015-present, Facebook, Inc.
 * modder: Copyright (c) 2021, Nexivil, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", err => {
    throw err;
});

const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const execSync = require("child_process").execSync;
const spawn = require("cross-spawn");
const os = require("os");

function isInGitRepository() {
    try {
        execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
        return true;
    } catch (e) {
        return false;
    }
}

function tryGitInit() {
    try {
        execSync("git --version", { stdio: "ignore" });
        if (isInGitRepository()) {
            return false;
        }

        execSync("git init", { stdio: "ignore" });
        return true;
    } catch (e) {
        console.warn("Git repo not initialized", e);
        return false;
    }
}

function tryGitCommit(appPath) {
    try {
        execSync("git add -A", { stdio: "ignore" });
        execSync('git commit -m "Initialize project using Create React App"', {
            stdio: "ignore",
        });
        return true;
    } catch (e) {
        // We couldn't commit in already initialized git repo,
        // maybe the commit author config is not set.
        // In the future, we might supply our own committer
        // like Ember CLI does, but for now, let's just
        // remove the Git files to avoid a half-done state.
        console.warn("Git commit not created", e);
        console.warn("Removing .git directory...");
        try {
            // unlinkSync() doesn't work on directories.
            fs.removeSync(path.join(appPath, ".git"));
        } catch (removeErr) {
            // Ignore.
        }
        return false;
    }
}

module.exports = function (
    appPath,
    appName,
    verbose,
    originalDirectory,
    templateName
) {
    const appPackage = require(path.join(appPath, "package.json"));

    if (!templateName) {
        console.log("");
        console.error(
            `A template was not provided. This is likely because you're using an outdated version of ${chalk.cyan(
                "@design-express/create-node"
            )}.`
        );
        console.error(
            `Please note that global installs of ${chalk.cyan(
                "@design-express/create-node"
            )} are no longer supported.`
        );
        console.error(
            `You can fix this by running ${chalk.cyan(
                "npm uninstall -g @design-express/create-node"
            )} before using ${chalk.cyan("@design-express/create-node")} again.`
        );
        return;
    }

    const templatePath = path.dirname(
        require.resolve(`${templateName}/package.json`, { paths: [appPath] })
    );

    const templateJsonPath = path.join(templatePath, "template.json");

    let templateJson = {};
    if (fs.existsSync(templateJsonPath)) {
        templateJson = require(templateJsonPath);
    }

    const templatePackage = templateJson.package || {};

    // TODO: Deprecate support for root-level `dependencies` and `scripts` in v5.
    // These should now be set under the `package` key.
    if (templateJson.dependencies || templateJson.scripts) {
        console.log();
        console.log(
            chalk.yellow(
                "Root-level `dependencies` and `scripts` keys in `template.json` are deprecated.\n" +
                    "This template should be updated to use the new `package` key."
            )
        );
        // console.log("For more information, visit https://cra.link/templates");
    }
    if (templateJson.dependencies) {
        templatePackage.dependencies = templateJson.dependencies;
    }
    if (templateJson.scripts) {
        templatePackage.scripts = templateJson.scripts;
    }

    // Keys to ignore in templatePackage
    const templatePackageBlacklist = [
        "name",
        "version",
        "description",
        "keywords",
        "bugs",
        "license",
        "author",
        "contributors",
        "files",
        "browser",
        "bin",
        "man",
        "directories",
        "repository",
        "peerDependencies",
        "bundledDependencies",
        "optionalDependencies",
        "engineStrict",
        "os",
        "cpu",
        "preferGlobal",
        "private",
        "publishConfig",
    ];

    // Keys from templatePackage that will be merged with appPackage
    const templatePackageToMerge = ["dependencies", "scripts"];

    // Keys from templatePackage that will be added to appPackage,
    // replacing any existing entries.
    const templatePackageToReplace = Object.keys(templatePackage).filter(
        key => {
            return (
                !templatePackageBlacklist.includes(key) &&
                !templatePackageToMerge.includes(key)
            );
        }
    );

    // Copy over some of the devDependencies
    appPackage.dependencies = appPackage.dependencies || {};

    // Setup the script rules
    const templateScripts = templatePackage.scripts || {};
    appPackage.scripts = Object.assign(
        {
            start: "node-scripts start",
            build: "rollup -c",
            // test: "node-scripts test",
            // eject: "node-scripts eject",
        },
        templateScripts
    );

    // Setup the eslint config
    appPackage.eslintConfig = {
        extends: "standard",
    };

    // Add templatePackage keys/values to appPackage, replacing existing entries
    templatePackageToReplace.forEach(key => {
        appPackage[key] = templatePackage[key];
    });

    fs.writeFileSync(
        path.join(appPath, "package.json"),
        JSON.stringify(appPackage, null, 2) + os.EOL
    );

    const readmeExists = fs.existsSync(path.join(appPath, "README.md"));
    if (readmeExists) {
        fs.renameSync(
            path.join(appPath, "README.md"),
            path.join(appPath, "README.old.md")
        );
    }

    // Copy the files for the user
    const templateDir = path.join(templatePath, "template");
    if (fs.existsSync(templateDir)) {
        fs.copySync(templateDir, appPath);
    } else {
        console.error(
            `Could not locate supplied template: ${chalk.green(templateDir)}`
        );
        return;
    }

    const gitignoreExists = fs.existsSync(path.join(appPath, ".gitignore"));
    if (gitignoreExists) {
        // Append if there's already a `.gitignore` file there
        const data = fs.readFileSync(path.join(appPath, "gitignore"));
        fs.appendFileSync(path.join(appPath, ".gitignore"), data);
        fs.unlinkSync(path.join(appPath, "gitignore"));
    } else {
        // Rename gitignore after the fact to prevent npm from renaming it to .npmignore
        // See: https://github.com/npm/npm/issues/1862
        fs.moveSync(
            path.join(appPath, "gitignore"),
            path.join(appPath, ".gitignore"),
            []
        );
    }

    // Initialize git repo
    let initializedGit = false;

    if (tryGitInit()) {
        initializedGit = true;
        console.log();
        console.log("Initialized a git repository.");
    }

    let command = "npm";
    let remove = "uninstall";
    let args = ["install", "--save", verbose && "--verbose"].filter(e => e);

    // Install additional template dependencies, if present.
    const dependenciesToInstall = Object.entries({
        ...templatePackage.dependencies,
        ...templatePackage.devDependencies,
    });
    if (dependenciesToInstall.length) {
        args = args.concat(
            dependenciesToInstall.map(([dependency, version]) => {
                return `${dependency}@${version}`;
            })
        );
    }

    // Install template dependencies, and react and react-dom if missing.
    if (templateName && args.length > 1) {
        console.log();
        console.log(`Installing template dependencies using ${command}...`);

        const proc = spawn.sync(command, args, { stdio: "inherit" });
        if (proc.status !== 0) {
            console.error(`\`${command} ${args.join(" ")}\` failed`);
            return;
        }
    }

    // Remove template
    console.log(`Removing template package using ${command}...`);
    console.log();

    const proc = spawn.sync(command, [remove, templateName], {
        stdio: "inherit",
    });
    if (proc.status !== 0) {
        console.error(`\`${command} ${args.join(" ")}\` failed`);
        return;
    }

    // Create git commit if git repo was initialized
    if (initializedGit && tryGitCommit(appPath)) {
        console.log();
        console.log("Created git commit.");
    }

    // Display the most elegant way to cd.
    // This needs to handle an undefined originalDirectory for
    // backward compatibility with old global-cli's.
    let cdpath;
    if (
        originalDirectory &&
        path.join(originalDirectory, appName) === appPath
    ) {
        cdpath = appName;
    } else {
        cdpath = appPath;
    }

    // Change displayed command to yarn instead of yarnpkg
    const displayedCommand = "npm";

    console.log();
    console.log(`Success! Created ${appName} at ${appPath}`);
    // console.log("Inside that directory, you can run several commands:");
    console.log();
    console.log(chalk.cyan(`  ${displayedCommand} start`));
    console.log("    Starts to connect with Design Express for development.");
    console.log();
    // console.log(
    //     chalk.cyan(`  ${displayedCommand} run build`)
    // );
    // console.log("    Bundles the app into static files for production.");
    // console.log();
    // console.log(chalk.cyan(`  ${displayedCommand} test`));
    // console.log("    Starts the test runner.");
    // console.log();
    // console.log(
    //     chalk.cyan(`  ${displayedCommand} run eject`)
    // );
    // console.log(
    //     "    Removes this tool and copies build dependencies, configuration files"
    // );
    // console.log(
    //     "    and scripts into the app directory. If you do this, you can’t go back!"
    // );
    // console.log();
    console.log("We suggest that you begin by typing:");
    console.log();
    console.log(chalk.cyan("  cd"), cdpath);
    console.log(`  ${chalk.cyan(`${displayedCommand} start`)}`);
    if (readmeExists) {
        console.log();
        console.log(
            chalk.yellow(
                "You had a `README.md` file, we renamed it to `README.old.md`"
            )
        );
    }
    console.log();
    console.log("To the Next Civil Engineering");
};
