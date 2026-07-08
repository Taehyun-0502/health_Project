package com.health.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class AppApplication {

	static {
		try {
			// 다양한 실행 디렉토리 기준 상대 경로 후보군 설정
			String[] envPaths = {
					".env",
					"../.env",
					"../../.env",
					"healthcareBack/.env",
					"../healthcareBack/.env"
			};

			File envFile = null;
			for (String path : envPaths) {
				File f = new File(path);
				if (f.exists()) {
					envFile = f;
					break;
				}
			}

			if (envFile != null && envFile.exists()) {
				System.out.println("=========================================");
				System.out.println("ℹ️ .env 파일 로드 성공: " + envFile.getAbsolutePath());
				System.out.println("=========================================");
				List<String> lines = Files.readAllLines(Paths.get(envFile.getAbsolutePath()));
				for (String line : lines) {
					line = line.trim();
					if (line.isEmpty() || line.startsWith("#")) {
						continue;
					}
					int delimiterIdx = line.indexOf("=");
					if (delimiterIdx > 0) {
						String key = line.substring(0, delimiterIdx).trim();
						String value = line.substring(delimiterIdx + 1).trim();
						System.setProperty(key, value);
					}
				}
			} else {
				System.err.println("=========================================");
				System.err.println("⚠️ .env 파일을 찾을 수 없습니다. 경로 확인 필요!");
				System.err.println("현재 작업 경로: " + new File(".").getAbsolutePath());
				System.err.println("=========================================");
			}
		} catch (Exception e) {
			System.err.println("Warning: Failed to load .env file: " + e.getMessage());
		}
	}

	public static void main(String[] args) {
		SpringApplication.run(AppApplication.class, args);
	}

}
