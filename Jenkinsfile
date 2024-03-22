node("server-status") {
  deleteDir();
  stage("SCM") {
    checkout scm;
  }

  stage("Generate") {
    sh(
      script: "npm install",
      label: "NPM install packages"
    );
    sh(
      script: "node generate-graphs.js public https://data.openspaceproject.com/log/data.json",
      label: "Generate page"
    )
  }

  if (env.BRANCH_NAME == "master") {
    stage("Deploy") {
      def target = "/var/www/status.openspaceproject.com/html/usage"

      sh(
        script: "rm -rf ${target}/*",
        label: "Remove old files"
      );
      sh(
        script: "mv public/* ${target}",
        label: "Deploy files"
      );
    }
  }
  else {
    echo("Skipping the deployment as we are not working on the 'master' branch")
    currentBuild.result = "NOT_BUILT";
  }
}