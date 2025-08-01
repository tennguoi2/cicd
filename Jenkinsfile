pipeline {
    agent any
    
    environment {
        DOCKER_HUB_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKER_IMAGE = 'tennguoi2/cicd-nodejs-mysql'
        DOCKER_TAG = "${BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    sh 'npm install'
                }
            }
        }
        
        
        
        stage('Build Docker Image') {
            steps {
                script {
                    def app = docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                    docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-credentials') {
                        app.push()
                        app.push("latest")
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    sh '''
                        docker-compose down
                        docker-compose pull
                        docker-compose up -d
                    '''
                }
            }
        }
        
        
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}