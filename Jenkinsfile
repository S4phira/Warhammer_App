pipeline {
  agent any
  stages {
    stage('Checkout Scm') {
      steps {
        git(credentialsId: '1', url: 'https://github.com/S4phira/Warhammer_app')
        git(credentialsId: '4', url: 'https://git.heroku.com/hidden-basin-93479.git')
      }
    }
  }
}