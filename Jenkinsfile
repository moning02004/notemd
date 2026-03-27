pipeline {
    agent any

    parameters {
        string(name: 'VERSION', defaultValue: '', description: 'Release 태그 (예: v1.0.0)')
    }
    environment {
        FE_IMAGE = "yujeonghoon/notemd_frontend"
        BE_IMAGE = "yujeonghoon/notemd_backend"
    }

    stages {
        stage('Checkout') {
        steps {
            script {
                // 태그 입력 확인
                if (!params.VERSION) {
                    error "VERSION이 입력되지 않았습니다."
                }
            }
            git branch: 'main',
                url: 'https://github.com/moning02004/notemd.git'

            script {
                // 태그 존재 여부 확인
                def tagExists = sh(
                    script: "git tag -l ${params.VERSION} | wc -l",
                    returnStdout: true
                ).trim()

                if (tagExists == '0') {
                    error "태그 '${params.VERSION}' 가 존재하지 않습니다."
                }

                // 해당 태그로 체크아웃
                sh "git checkout tags/${params.VERSION}"
                echo "✅ ${params.VERSION} 태그로 체크아웃 완료"
            }
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
                echo "docker build 단계"

                sh "cd frontend && docker build -t $FE_IMAGE:${params.VERSION} ."
                sh "cd backend && docker build -t $BE_IMAGE:${params.VERSION} ."
            }
        }

        stage('Docker Login') {
            steps {
                echo "docker 로그인 단계"
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
                echo "docker push 단계"
                sh "docker push $FE_IMAGE:${params.VERSION}"
                sh "docker push $BE_IMAGE:${params.VERSION}"
            }
        }

        stage('Deploy (Ansible)') {
            steps {
                echo "ansible 배포 단계"

//                 sh "ansible-playbook deploy.yml --extra-vars 'tag=$TAG'"
            }
        }
    }
}