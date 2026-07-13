package com.health.app.ai;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.health.app.config.JwtUtill;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberMapper;

import io.jsonwebtoken.Claims;

/**
 * AI 비서 API (Phase 1 MVP - OWNER 전용).
 * 표준 수동 인증 패턴: Authorization 헤더 -> JwtUtill.extractAllClaims.
 * gymId는 JWT에 없으므로 DB에서 파생해 AuthContext에 주입한다(없으면 -1로 차단).
 */
@RestController
@RequestMapping("/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @Autowired
    private JwtUtill jwtUtill;

    @Autowired
    private MemberMapper memberMapper;

    // SSE 오케스트레이션 실행용 스레드 풀 (SseEmitter는 반환 후 별도 스레드에서 이벤트 방출)
    private final ExecutorService executor = Executors.newCachedThreadPool();

    // Authorization 헤더에서 로그인 사용자 정보(아이디/권한) 추출 메서드
    private Claims extractClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        try {
            return jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    // JWT claim -> AuthContext 구성 (gymId는 h_member에서 파생, 없으면 -1로 테넌트 차단)
    private AuthContext buildContext(Claims claims) throws Exception {
        Long username = Long.parseLong(claims.getSubject());
        String role = claims.get("role", String.class);
        role = role == null ? null : role.toUpperCase();

        MemberDTO find = new MemberDTO();
        find.setUsername(username);
        MemberDTO member = memberMapper.idcheck(find);
        Long gymId = (member != null && member.getGymId() != null) ? member.getGymId() : -1L;

        return new AuthContext(username, role, gymId);
    }

    // 챗 메시지 전송 - SSE 스트림으로 start/tool/answer/error 이벤트 반환
    @PostMapping("/chat")
    public Object chat(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody AiChatRequest request) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        AuthContext ctx = buildContext(claims);
        // Phase 1: OWNER만 이용 가능
        if (!"OWNER".equals(ctx.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("AI 비서는 현재 사장님(OWNER)만 이용할 수 있습니다.");
        }

        if (request.getMessage() == null || request.getMessage().isBlank()) {
            return ResponseEntity.badRequest().body("메시지를 입력해 주세요.");
        }

        SseEmitter emitter = new SseEmitter(5L * 60 * 1000); // 5분 타임아웃
        executor.execute(() -> aiService.chat(ctx, request, emitter));
        return emitter;
    }

    // 대화 세션 목록 조회 (본인 것만)
    @GetMapping("/conversations")
    public ResponseEntity<?> conversationList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        AuthContext ctx = buildContext(claims);
        if (!"OWNER".equals(ctx.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        return ResponseEntity.ok(aiService.conversationList(ctx));
    }

    // 대화 메시지 목록 조회 (본인 소유 대화만)
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<?> messageList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long conversationId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        AuthContext ctx = buildContext(claims);
        if (!"OWNER".equals(ctx.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        List<AiMessageDTO> messages = aiService.messageList(ctx, conversationId);
        if (messages == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("대화가 없거나 열람 권한이 없습니다.");
        }
        return ResponseEntity.ok(messages);
    }
}
