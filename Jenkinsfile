node("server-status") {
  deleteDir();
  stage("SCM") {
    checkout scm;
  }

  //
  // Usage graphs
  //
  dir("usage") {
    stage("Generate") {
      sh(
        script: "npm install",
        label: "NPM install packages"
      );
      sh(
        script: "node create-graphs.js public https://data.openspaceproject.com/log/data.json",
        label: "Generate page"
      )
      sh(
        script: "tsc process_startup_log.ts && mv process_startup_log.js process_startup_log.cjs",
        label: "Transpile startup process script"
      );
    }

    if (env.BRANCH_NAME == "master") {
      stage("Deploy") {
        def target = "/var/www/status.openspaceproject.com/html/usage"

        sh(
          script: "mkdir -p ${target}",
          label: "Create directory if it does not already exist"
        );
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
  }


  if (env.BRANCH_NAME != "master") {
    echo("Skipping the deployment as we are not working on the 'master' branch")
    currentBuild.result = "NOT_BUILT";
  }
}
