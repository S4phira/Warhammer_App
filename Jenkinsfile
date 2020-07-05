node {
 try {
  stage('Checkout') {
  checkout scm
 }
  stage('Deploy - Production') {
     sh('git push heroku master')
  } 
 }
 catch (err) {
    println err;
  }
}