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

    //만료시간 30분
    private final long time = 1000 * 60 * 30;

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





}
