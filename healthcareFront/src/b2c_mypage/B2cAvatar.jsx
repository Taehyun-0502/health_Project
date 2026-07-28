import { useState, useEffect, useRef } from 'react';
import './B2cPages.css';

// 아바타 색상 팔레트
const colors = {
  skinLight: '#ffd6b5',
  skinDark: '#e5a97a',
  outline: '#404040', /* gray-700 토큰값 — canvas는 var() 미지원 */
  pants: '#a3e635', /* b2c-lime 토큰값 — canvas는 var() 미지원 */
  hair: '#171717', /* gray-900 토큰값 — canvas는 var() 미지원 */
  shoes: '#ffffff' /* white 토큰값 — canvas는 var() 미지원 */
};

// 레벨별 메시지 데이터
const levelData = [
  { minDays: 0, title: "Lv.1 마른장작", msg: "바람 불면 날아갈 것 같습니다." },
  { minDays: 5, title: "Lv.2 헬린이", msg: "팔에 약간의 탄력이 생겼습니다!" },
  { minDays: 12, title: "Lv.3 근육몬", msg: "어깨가 넓어지고 등근육이 보이기 시작합니다." },
  { minDays: 21, title: "Lv.4 헬창", msg: "걸어다니는 조각상! 옷이 터지려고 합니다." }
];

function B2cAvatar() {
  const [days, setDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 백엔드 실제 출석 테이블 데이터 개수(List Size)를 가져와 days에 세팅
  useEffect(() => {
    const fetchCheckinData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/checkin/list`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          
          // 아바타 성장은 오직 최근 30일 이내의 출석 기록만 집계
          const today = new Date();
          const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          const recentCheckins = data.filter(item => {
            if (!item.checkIn) return false;
            const checkinDate = new Date(item.checkIn);
            return checkinDate >= thirtyDaysAgo && checkinDate <= today;
          });

          setDays(recentCheckins.length);
        }
      } catch (error) {
        console.error("출석 데이터 로딩 실패", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheckinData();
  }, [user.username]);

  // 현재 날짜에 맞는 레벨 찾기
  let currentLevel = levelData[0];
  for (let i = levelData.length - 1; i >= 0; i--) {
    if (days >= levelData[i].minDays) {
      currentLevel = levelData[i];
      break;
    }
  }

  // 캔버스 그리기 로직 (days 상태가 변할 때마다 실행)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 0 ~ 1 사이의 성장 계수 (0일=0, 30일=1)
    const factor = Math.min(days / 30, 1);

    // 캔버스 중앙 기준점
    const cx = 300;
    const shoulderY = 220; 
    const waistY = 360;    
    const crotchY = 400;   

    // 부위별 수치 정밀 계산
    const chestW = 70 + (factor * 110); 
    const waistW = 55 + (factor * 30);  
    
    const armThick = 18 + (factor * 35);
    const forearmThick = 14 + (factor * 22);
    const shoulderRadius = 15 + (factor * 22); 
    const fistRadius = 12 + (factor * 8);      
    
    const thighThick = 25 + (factor * 45);
    const calfThick = 18 + (factor * 25);
    const neckThick = 20 + (factor * 25);

    // 뼈대 위치 계산 (만세 자세)
    const lsx = cx - chestW/2; 
    const lsy = shoulderY;
    const lex = lsx - 50 - (factor * 35); 
    const ley = lsy - 15 - (factor * 20);
    const lwx = lex + 15 + (factor * 15); 
    const lwy = ley - 45 - (factor * 25);

    const rsx = cx + chestW/2;
    const rsy = shoulderY;
    const rex = rsx + 50 + (factor * 35);
    const rey = rsy - 15 - (factor * 20);
    const rwx = rex - 15 - (factor * 15);
    const rwy = rey - 45 - (factor * 25);

    const lhx = cx - waistW/2 + 10; 
    const lhy = crotchY - 10;
    const lkx = lhx - 20; 
    const lky = lhy + 80;
    const lax = lkx - 5; 
    const lay = lky + 80;

    const rhx = cx + waistW/2 - 10;
    const rhy = crotchY - 10;
    const rkx = rhx + 20;
    const rky = rhy + 80;
    const rax = rkx + 5;
    const ray = rky + 80;

    const legSegments = [
        { p1: {x: lhx, y: lhy}, p2: {x: lkx, y: lky}, thick: thighThick },
        { p1: {x: lkx, y: lky}, p2: {x: lax, y: lay}, thick: calfThick },
        { p1: {x: rhx, y: rhy}, p2: {x: rkx, y: rky}, thick: thighThick },
        { p1: {x: rkx, y: rky}, p2: {x: rax, y: ray}, thick: calfThick }
    ];

    const armSegments = [
        { p1: {x: lsx, y: lsy}, p2: {x: lex, y: ley}, thick: armThick },
        { p1: {x: lex, y: ley}, p2: {x: lwx, y: lwy}, thick: forearmThick },
        { p1: {x: rsx, y: rsy}, p2: {x: rex, y: rey}, thick: armThick },
        { p1: {x: rex, y: rey}, p2: {x: rwx, y: rwy}, thick: forearmThick }
    ];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 바닥 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(cx, lay + 20, 70 + factor*30, 15, 0, 0, Math.PI*2);
    ctx.fill();

    const drawSegments = (segments, isOutline) => {
        segments.forEach(seg => {
            ctx.beginPath();
            ctx.moveTo(seg.p1.x, seg.p1.y);
            ctx.lineTo(seg.p2.x, seg.p2.y);
            ctx.lineWidth = isOutline ? seg.thick + 8 : seg.thick;
            ctx.strokeStyle = isOutline ? colors.outline : colors.skinLight;
            ctx.stroke();
        });
    };

    const traceTorso = () => {
        ctx.beginPath();
        ctx.moveTo(cx - waistW/2, waistY); 
        ctx.quadraticCurveTo(cx - chestW/2 - (factor * 30), (shoulderY + waistY)/2, cx - chestW/2, shoulderY);
        ctx.lineTo(cx + chestW/2, shoulderY); 
        ctx.quadraticCurveTo(cx + chestW/2 + (factor * 30), (shoulderY + waistY)/2, cx + waistW/2, waistY); 
        ctx.closePath();
    };

    // 1. 다리
    drawSegments(legSegments, true); 
    drawSegments(legSegments, false); 

    // 신발
    ctx.fillStyle = colors.shoes;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(lax - 10 - factor*5, lay + 10, 25 + factor*5, 14 + factor*3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(rax + 10 + factor*5, ray + 10, 25 + factor*5, 14 + factor*3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    // 2. 상체
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = neckThick + 8;
    ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx, shoulderY - 40); ctx.stroke();
    
    drawSegments(armSegments, true);

    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(lwx, lwy, fistRadius, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rwx, rwy, fistRadius, 0, Math.PI*2); ctx.stroke();

    ctx.beginPath(); ctx.arc(lsx, lsy, shoulderRadius, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rsx, rsy, shoulderRadius, 0, Math.PI*2); ctx.stroke();
    
    traceTorso();
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.strokeStyle = colors.skinLight;
    ctx.fillStyle = colors.skinLight;
    
    ctx.lineWidth = neckThick;
    ctx.beginPath(); ctx.moveTo(cx, shoulderY); ctx.lineTo(cx, shoulderY - 40); ctx.stroke();
    
    drawSegments(armSegments, false);

    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(lwx, lwy, fistRadius, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(rwx, rwy, fistRadius, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    ctx.beginPath(); ctx.arc(lsx, lsy, shoulderRadius, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(rsx, rsy, shoulderRadius, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    
    traceTorso();
    ctx.fill();
    ctx.lineWidth = 4; 
    ctx.stroke();

    // 3. 디테일 근육 선
    ctx.strokeStyle = colors.skinDark;
    ctx.lineCap = 'round';
    
    if (factor > 0) {
        ctx.globalAlpha = 0.5 + (factor * 0.5);
        ctx.lineWidth = 3 + factor*2;
        ctx.beginPath(); ctx.moveTo(cx, shoulderY + 20 + factor*15); ctx.quadraticCurveTo(cx - chestW/3, shoulderY + 40 + factor*30, cx - chestW/2 + 10, shoulderY + 10 + factor*5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, shoulderY + 20 + factor*15); ctx.quadraticCurveTo(cx + chestW/3, shoulderY + 40 + factor*30, cx + chestW/2 - 10, shoulderY + 10 + factor*5); ctx.stroke();

        ctx.lineWidth = 2 + factor*1.5;
        ctx.beginPath(); ctx.moveTo(cx - 5, shoulderY + 5); ctx.lineTo(cx - chestW/2 + 15, shoulderY - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 5, shoulderY + 5); ctx.lineTo(cx + chestW/2 - 15, shoulderY - 5); ctx.stroke();

        ctx.lineWidth = 2 + factor;
        ctx.beginPath(); ctx.moveTo(lex + 10 + factor*5, ley + 5); ctx.quadraticCurveTo((lsx+lex)/2, (lsy+ley)/2 - factor*15, lsx - 5, lsy + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rex - 10 - factor*5, rey + 5); ctx.quadraticCurveTo((rsx+rex)/2, (rsy+rey)/2 - factor*15, rsx + 5, rsy + 10); ctx.stroke();

        if (factor > 0.3) {
            ctx.globalAlpha = (factor - 0.3) * 1.4; 
            ctx.lineWidth = 2 + factor;
            const absY = shoulderY + 50 + factor*20;
            ctx.beginPath(); ctx.moveTo(cx, absY - 10); ctx.lineTo(cx, waistY - 10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - 15 - factor*5, absY); ctx.lineTo(cx + 15 + factor*5, absY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - 12 - factor*5, absY + 20 + factor*5); ctx.lineTo(cx + 12 + factor*5, absY + 20 + factor*5); ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
    }

    // 4. 바지
    ctx.fillStyle = colors.pants;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - waistW/2 - 5, waistY - 15); 
    ctx.lineTo(cx + waistW/2 + 5, waistY - 15); 
    ctx.lineTo(cx + waistW/2 + 15, crotchY + 20); 
    ctx.lineTo(cx + 5, crotchY + 10); 
    ctx.lineTo(cx - 5, crotchY + 10);
    ctx.lineTo(cx - waistW/2 - 15, crotchY + 20); 
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. 머리와 얼굴
    const headY = shoulderY - 65 - (factor * 5); 
    const headRadius = 38;

    ctx.fillStyle = colors.skinLight;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, headY, headRadius, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#171717'; /* gray-900 토큰값 — canvas는 var() 미지원 */
    ctx.beginPath(); ctx.arc(cx - 12, headY - 5, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 12, headY - 5, 4, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = '#171717'; /* gray-900 토큰값 — canvas는 var() 미지원 */
    ctx.lineWidth = 3;
    ctx.beginPath(); 
    if(factor < 0.2) {
        ctx.arc(cx, headY + 10, 8, 0.1, Math.PI - 0.1);
    } else {
        ctx.moveTo(cx - 8, headY + 15); ctx.lineTo(cx + 8, headY + 15);
    }
    ctx.stroke();

    ctx.fillStyle = colors.hair;
    ctx.beginPath();
    ctx.arc(cx, headY - 10, headRadius + 2, Math.PI + 0.3, Math.PI*2 - 0.3);
    ctx.quadraticCurveTo(cx, headY - 25, cx - 35, headY - 5);
    ctx.fill();

  }, [days]);

  return (
    <div className="b2c-avatar">
      
      {/* 캔버스 (미니룸 캐릭터) 영역 */}
      <div className="b2c-avatar__room">
        {/* 배경 점선 패턴 */}
        <div className="b2c-avatar__pattern" />
        <canvas ref={canvasRef} width="600" height="600" className="b2c-avatar__canvas" />
      </div>

      {/* 시연용 실시간 아바타 성장 조절 슬라이더 */}
      <div style={{ margin: '15px 0 10px 0', width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--gray-500)', marginBottom: '6px', fontWeight: '750' }}>
          <span>슬라이더로 시연 (0일)</span>
          <span>(30일)</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="30" 
          value={days} 
          onChange={(e) => setDays(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '999px',
            backgroundColor: 'var(--gray-200)',
            outline: 'none',
            cursor: 'pointer',
            accentColor: 'var(--b2c-accent)'
          }}
        />
      </div>

      {/* 하단 정보 영역 (수동 출석하기 버튼 배제) */}
      <div className="b2c-avatar__info">
        {isLoading ? (
          <div className="b2c-avatar__loading">
            출석 데이터를 불러오는 중...
          </div>
        ) : (
          <div className="b2c-avatar__status">
            <div className="b2c-avatar__summary">
              <span className="b2c-avatar__days">
                출석: <strong>{days}</strong>일
              </span>
              <span className="b2c-avatar__level">
                {currentLevel.title}
              </span>
            </div>
            <div className="b2c-avatar__message">
              {currentLevel.msg}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default B2cAvatar;
