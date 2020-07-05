node {
 try {
  stage('Checkout') {
  checkout scm
 }
  stage('Deploy - Production') {
     bat('git push heroku master')
  } 
 }
 catch (err) {
    println err;
  }
}