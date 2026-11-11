node("server-status") {
  deleteDir();
  stage("SCM") {
    checkout scm;
  }

  //
  // Usage graphs
  //
  stage("Install") {
    sh(
      // 'npm ci' installs exactly the versions from package-lock.json and fails if the
      // lock file does not match package.json
      script: "npm ci",
      label: "NPM install packages"
    );
  }

  stage("Check") {
    sh(
      script: "npm run lint",
      label: "Check formatting, linting, and geolocation.json"
    );
    sh(
      script: "npm test",
      label: "Run tests"
    );
  }

  stage("Generate") {
    sh(
      script: "npm run build",
      label: "Generate page"
    );
  }

  if (env.BRANCH_NAME == "master") {
    stage("Deploy") {
      def target = "/var/www/status.openspaceproject.com/html"

      sh(
        script: "mkdir -p ${target}",
        label: "Create directory if it does not already exist"
      );
      sh(
        script: "rm -rf ${target}/*",
        label: "Remove old files"
      );
      sh(
        script: "mv dist/* ${target}",
        label: "Deploy files"
      );
    }
  }


  if (env.BRANCH_NAME != "master") {
    echo("Skipping the deployment as we are not working on the 'master' branch")
    currentBuild.result = "NOT_BUILT";
  }
}
