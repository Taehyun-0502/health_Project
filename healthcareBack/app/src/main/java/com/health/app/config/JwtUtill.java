package com.health.app.config;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;



@Component
public class JwtUtill {

    private final Key key;

    //엑세스토큰 만료시간 30분
    private final long time = 1000 * 60 * 30;

    //리프레시토큰 만료기간 7일
    private final long refreshTime = 1000L * 60 * 60 * 24 * 7;

    // yml에서 시크릿키를 주입받아 Key 객체 생성
    public JwtUtill(@Value("${jwt.secret}") String secretKey){
        this.key=Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    //토큰생성 메서드
    public String generateToken(String username, String role)throws Exception{
        Map<String,Object>claims=new HashMap<>();
        claims.put("role", role);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis()+time))
                .signWith(key,SignatureAlgorithm.HS256)
                .compact()
                ;

    }

    //토큰에서 claim 정보추출 메서드
    public Claims extractAllClaims(String token) throws Exception{
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                ;
    }

    //토큰에서 id(전화번호) 추출 메서드
    public String extractUsername(String token)throws Exception{
        return extractAllClaims(token).getSubject();
    }

    //토큰 유효성 및 만료여부 검증 메서드
    public boolean validateToken(String token,String username) throws Exception{

        try{//만약 기간이 만료된경우 catch로 넘어가서 false를 반환함
            final String extractedUsername = extractUsername(token);
            return(extractedUsername.equals(username));
        }catch(Exception e){
            return false;
        }
    }
    
    // 리프레쉬 토큰 생성 메서드 (7일 유효)
    public String generateRefreshToken(String username) throws Exception {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + refreshTime))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // 리프레쉬 토큰 만료 예정 시각을 LocalDateTime으로 계산 반환 (DB 저장용)
    public java.time.LocalDateTime getExpiryDateTime() {
        return java.time.LocalDateTime.now().plusDays(7);
    }

    // [추가] 리프레쉬 토큰 자체의 만료 및 서명 위조 유효성 검증
    public boolean isRefreshTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);
            // 토큰의 만료 시간이 현재 시간보다 이전(before)인지 검사
            return !claims.getExpiration().before(new Date());
        } catch (Exception e) {
            // 서명이 변조되었거나 기한이 지나 에러가 발생한 경우 무효(false) 처리
            return false;
        }
    }



}
