import { useState, useEffect, useRef } from 'react';

// 아바타 색상 팔레트
const colors = {
  skinLight: '#ffd6b5',
  skinDark: '#e5a97a',
  outline: '#3e2723',
  pants: '#a3e635',
  hair: '#2c3e50',
  shoes: '#ffffff',
  bar: '#94a3b8',        // 은색 바벨 봉
  plate: '#22c55e',      // 진한 초록색 원판
  plateLine: '#15803d'   // 원판 내부 줄무늬선
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

  // 백엔드 실제 출석 데이터 가져와 최근 30일 데이터 세팅
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

  // 캔버스 그리기 로직 (바벨을 아바타 뒤쪽 레이어로 배치)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 0 ~ 1 사이의 성장 계수 (0일=0, 30일=1)
    const factor = Math.min(days / 30, 1);

    // 캔버스 중앙 기준점
    const cx = 300;
    const shoulderY = 230; 
    const waistY = 365;    
    const crotchY = 405;   

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

    // 뼈대 위치 계산
    const lsx = cx - chestW/2; 
    const lsy = shoulderY;
    const lex = lsx - 55 - (factor * 35); 
    const ley = lsy - 10 - (factor * 15);
    const lwx = lex + 20 + (factor * 15); 
    const lwy = ley - 55 - (factor * 25);

    const rsx = cx + chestW/2;
    const rsy = shoulderY;
    const rex = rsx + 55 + (factor * 35);
    const rey = rsy - 10 - (factor * 15);
    const rwx = rex - 20 - (factor * 15);
    const rwy = rey - 55 - (factor * 25);

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

    // 1. 바닥 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(cx, lay + 20, 70 + factor*30, 15, 0, 0, Math.PI*2);
    ctx.fill();

    // ================= [아바타 뒤쪽 레이어] 바벨 & 무게 원판 렌더링 =================
    const barY = (lwy + rwy) / 2;
    const numPlates = 1 + Math.floor(factor * 3); 
    const plateWidth = 14;
    const plateHeight = 75 + (factor * 20); 

    const leftPlateStartX = lwx - 45;  
    const rightPlateStartX = rwx + 45; 

    const totalPlateSpan = numPlates * (plateWidth + 5);
    const barMinX = leftPlateStartX - totalPlateSpan - 25;
    const barMaxX = rightPlateStartX + totalPlateSpan + 25;

    // 1) 은색 바벨 봉 (아바타 뒤편에 안착)
    ctx.lineWidth = 13;
    ctx.strokeStyle = colors.bar;
    ctx.beginPath();
    ctx.moveTo(barMinX, barY);
    ctx.lineTo(barMaxX, barY);
    ctx.stroke();
    
    ctx.lineWidth = 5;
    ctx.strokeStyle = colors.outline;
    ctx.stroke();

    // 2) 초록 원판 (아바타 뒤편에 꽂힘)
    const drawPlates = (side) => {
      const isLeft = side === 'left';
      const startX = isLeft ? leftPlateStartX : rightPlateStartX;
      const dir = isLeft ? -1 : 1;

      for (let i = 0; i < numPlates; i++) {
        const px = startX + (dir * i * (plateWidth + 5));
        
        ctx.fillStyle = colors.plate;
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.roundRect(px - plateWidth/2, barY - plateHeight/2, plateWidth, plateHeight, 4);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = colors.plateLine;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px, barY - plateHeight/2 + 6);
        ctx.lineTo(px, barY + plateHeight/2 - 6);
        ctx.stroke();
      }

      const clipX = startX + (dir * (numPlates * (plateWidth + 5) - 5));
      ctx.fillStyle = colors.outline;
      ctx.beginPath();
      ctx.arc(clipX, barY, 7, 0, Math.PI*2);
      ctx.fill();
    };

    drawPlates('left');
    drawPlates('right');
    // ======================================================================================

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

    // 2. 아바타 다리
    drawSegments(legSegments, true); 
    drawSegments(legSegments, false); 

    // 신발
    ctx.fillStyle = colors.shoes;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(lax - 10 - factor*5, lay + 10, 25 + factor*5, 14 + factor*3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(rax + 10 + factor*5, ray + 10, 25 + factor*5, 14 + factor*3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    // 3. 아바타 상체 & 팔 (바벨보다 앞으로 오게 하여 아바타 뒤에 바벨이 놓임)
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

    // 4. 아바타 디테일 근육 선
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

    // 5. 아바타 바지
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

    // 6. 아바타 머리와 얼굴
    const headY = shoulderY - 65 - (factor * 5); 
    const headRadius = 38;

    ctx.fillStyle = colors.skinLight;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, headY, headRadius, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx - 12, headY - 5, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 12, headY - 5, 4, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = '#000';
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 auto' }}>
      
      {/* 캔버스 (미니룸 캐릭터) 영역 */}
      <div 
        style={{ 
          position: 'relative',
          width: '300px',
          height: '300px',
          border: '1px solid var(--gray-200)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(to bottom, var(--b2c-lime-bg) 65%, #d2b48c 65%)',
          boxShadow: '0 1px 3px rgba(23,23,23,.06)'
        }}
      >
        {/* 배경 점선 패턴 */}
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: '35%',
            backgroundImage: 'radial-gradient(var(--b2c-lime-line) 1px, transparent 1px)',
            backgroundSize: '15px 15px' 
          }}
        />
        <canvas ref={canvasRef} width="600" height="600" style={{ width: '300px', height: '300px', zIndex: 10 }} />
      </div>

      {/* 시연용 실시간 아바타 성장 조절 슬라이더 */}
      <div style={{ margin: '15px 0 10px 0', width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-caption2)', color: 'var(--gray-500)', marginBottom: '6px', fontWeight: '600' }}>
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

      {/* 하단 정보 영역 */}
      <div style={{ marginTop: '10px', width: '300px', textAlign: 'center' }}>
        {isLoading ? (
          <div style={{ color: 'var(--gray-400)', fontSize: '14px', padding: '10px' }}>
            출석 데이터를 불러오는 중...
          </div>
        ) : (
          <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                출석: <strong style={{ fontSize: '18px', color: 'var(--b2c-accent)' }}>{days}</strong>일
              </span>
              <span style={{
                fontSize: '11px',
                backgroundColor: 'var(--b2c-accent)',
                color: '#fff',
                padding: '2px 10px',
                borderRadius: '999px',
                fontWeight: 'bold'
              }}>
                {currentLevel.title}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--b2c-accent)', fontWeight: 'bold', minHeight: '20px', marginTop: '6px' }}>
              {currentLevel.msg}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default B2cAvatar;
