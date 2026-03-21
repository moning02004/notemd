pipeline {
    agent any

    environment {
        FE_IMAGE = "yujeonghoon/notemd_frontend"
        FE_VERSION = "${FE_VERSION}"

        BE_IMAGE = "yujeonghoon/notemd_backend"
        BE_VERSION = "${BE_VERSION}"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/moning02004/notemd.git'
            }
        }

//         stage('Build App') {
//             steps {
//                 sh 'echo "빌드 단계 (필요 시 추가)"'
//             }
//         }

//         stage('Test') {
//             steps {
//                 sh 'echo "테스트 단계 (선택)"'
//             }
//         }

        stage('Docker Build') {
            steps {
                sh 'echo "docker build 단계"'
                sh 'echo "docker $FE_VERSION, $BE_VERSION 빌드 준비"'

                sh 'cd frontend && docker build -t $FE_IMAGE:$FE_VERSION .'
                sh 'cd backend && docker build -t $BE_IMAGE:$BE_VERSION .'
            }
        }

        stage('Docker Login') {
            steps {
                sh 'echo "docker 로그인 단계"'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub',
                    usernameVariable: 'USER',
                    passwordVariable: 'PASS'
                )]) {
                    sh 'echo $PASS | docker login -u $USER --password-stdin'
                }
            }
        }

        stage('Docker Push') {
            steps {
                sh 'echo "docker push 단계"'
                sh 'docker push $FE_IMAGE:$FE_VERSION'
                sh 'docker push $BE_IMAGE:$BE_VERSION'
            }
        }

        stage('Deploy (Ansible)') {
            steps {
                sh 'echo "ansible 배포 단계"'

//                 sh "ansible-playbook deploy.yml --extra-vars 'tag=$TAG'"
            }
        }
    }
}