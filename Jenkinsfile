node {
  currentBuild.result = "SUCCESS"
  setBuildStatus("Build started", "PENDING");

  try {
    stage('Checkout') {
      checkout scm
    }

    stage('Deploy - Production') {
      withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'Heroku Git Login',
						usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD']]) {
       sh('git push heroku master')
    }
    setBuildStatus("Production build complete", "SUCCESS");
  }
}