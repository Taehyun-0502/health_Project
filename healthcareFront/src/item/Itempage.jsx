import React, { useState, useEffect, useMemo } from 'react';
import './Itempage.css';

// SVG 아이콘 컴포넌트 정의
const ListIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 14h6v-10h-6v10zm0 6h6v-4h-6v4zm8-16v6h10v-6h-10zm0 16h10v-10h-10v10zm0-8h10v-2h-10v2z" fill="currentColor" />
  </svg>
);

const FormIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
  </svg>
);

const LinksIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor" />
  </svg>
);

function Itempage() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'form' | 'links'

  // DB 테이블 스펙에 맞춘 물품 데이터 목록 상태 관리 (itemId, gymId, itemCategory, itemName, itemBuy, itemPrice, itemCount)
  const [items, setItems] = useState([
    { itemId: 1, gymId: 1, itemCategory: '기구', itemName: '아령 (10kg)', itemBuy: '2026-06-01', itemPrice: 25000, itemCount: 15 },
    { itemId: 2, gymId: 1, itemCategory: '소모품', itemName: '요가매트 (두꺼움)', itemBuy: '2026-06-15', itemPrice: 15000, itemCount: 30 },
    { itemId: 3, gymId: 2, itemCategory: '기구', itemName: '런닝머신 A호기', itemBuy: '2026-05-10', itemPrice: 1800000, itemCount: 1 },
    { itemId: 4, gymId: 1, itemCategory: '식품', itemName: '단백질 쉐이크 (초코)', itemBuy: '2026-06-28', itemPrice: 3500, itemCount: 50 },
    { itemId: 5, gymId: 2, itemCategory: '소모품', itemName: '스트레칭 밴드', itemBuy: '2026-06-20', itemPrice: 5000, itemCount: 20 },
  ]);

  // 로그인된 유저의 사업장 id (localStorage에서 조회, 없을 시 기본값 1)
  const [gymId, setGymId] = useState(() => {
    const saved = localStorage.getItem('memberInfo');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.gymId || 2;
      } catch (e) {
        return 2;
      }
    }
    return 1;
  });

  const [loading, setLoading] = useState(false);

  // 백엔드로부터 물품 리스트 조회 API 호출
  const fetchItems = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/list?gymId=${gymId}`);
      if (response.ok) {
        setItems(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [gymId]);

  // 검색 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 등록 폼 타입: 'new' (새로운 물품 등록) | 'existing' (기존 물품 등록)
  const [formType, setFormType] = useState('new');

  // 등록 폼 입력값 상태 관리 (ItemDTO 스펙과 변수명 100% 매칭)
  const [formData, setFormData] = useState({
    itemCategory: '기구',
    itemName: '',
    itemBuy: new Date().toISOString().split('T')[0],
    itemPrice: '',
    itemCount: ''
  });

  // 기존 물품 등록 시 선택할 기존 물품명
  const [selectedExistingName, setSelectedExistingName] = useState('');

  // 해당 사업장(gymId) 내 중복 제거된 물품명 리스트
  const existingItemNames = useMemo(() => {
    const names = items
      .filter(item => item.gymId === gymId)
      .map(item => item.itemName)
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [items, gymId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const finalItemName = formType === 'new' ? formData.itemName.trim() : selectedExistingName;

    if (!finalItemName) {
      alert('물품명을 입력해주세요.');
      return;
    }
    if (!formData.itemCount || parseInt(formData.itemCount, 10) <= 0) {
      alert('올바른 갯수를 입력해주세요.');
      return;
    }

    const newItem = {
      itemId: 0,
      gymId: gymId,
      itemCategory: formData.itemCategory,
      itemName: finalItemName,
      itemBuy: formData.itemBuy,
      itemPrice: formData.itemPrice ? parseInt(formData.itemPrice, 10) : 0,
      itemCount: parseInt(formData.itemCount, 10)
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newItem)
      });

      if (response.ok) {
        alert('물품이 성공적으로 등록되었습니다.');
        fetchItems();

        // 폼 초기화 및 목록으로 돌아가기
        setFormData({
          itemCategory: '기구',
          itemName: '',
          itemBuy: new Date().toISOString().split('T')[0],
          itemPrice: '',
          itemCount: ''
        });
        setSelectedExistingName('');
        setActiveTab('list');
      } else {
        alert('물품 등록에 실패하였습니다.');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 검색어 및 gymId로 필터링된 아이템 리스트
  const filteredItems = items.filter(item => {
    const matchesGym = item.gymId === gymId;
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCategory.includes(searchTerm);
    return matchesGym && matchesSearch;
  });

  return (
    <div className="item-page-container">
      {/* 좌측 사이드바 탭 메뉴 영역 */}
      <aside className="item-sidebar">
        <div className="item-sidebar-title">물품 관리 시스템</div>
        <nav>
          <ul className="item-sidebar-menu">
            <li>
              <button
                className={`item-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                onClick={() => setActiveTab('list')}
              >
                <ListIcon />
                물품 목록
              </button>
            </li>
            <li>
              <button
                className={`item-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                onClick={() => setActiveTab('form')}
              >
                <FormIcon />
                물품 등록
              </button>
            </li>
            <li>
              <button
                className={`item-tab-btn ${activeTab === 'links' ? 'active' : ''}`}
                onClick={() => setActiveTab('links')}
              >
                <LinksIcon />
                바로가기 링크
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* 우측 상세 컨텐츠 영역 */}
      <main className="item-content-area">
        {activeTab === 'list' && (
          <div className="item-tab-content">
            <div className="item-card">
              <h2 className="item-card-title">등록된 물품 목록</h2>

              {/* 실제 운영 시에는 로그인 정보(gymId)에 따라 고정됩니다. */}

              {/* 검색 바 */}
              <div className="item-search-bar">
                <input
                  type="text"
                  className="item-search-input"
                  placeholder="물품명 또는 카테고리로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* 테이블 목록 (분류, 물품 명, 갯수 항목만 출력) */}
              <div className="item-table-wrapper">
                <table className="item-table">
                  <thead>
                    <tr>
                      <th>번호</th>
                      <th>분류</th>
                      <th>물품명</th>
                      <th>갯수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item, index) => (
                        <tr key={item.itemId || index}>
                          <td>{filteredItems.length - index}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              backgroundColor: '#e0e7ff',
                              color: '#4f46e5',
                              fontSize: '0.8rem',
                              fontWeight: '600'
                            }}>
                              {item.itemCategory}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{item.itemName}</td>
                          <td>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                              {item.itemCount.toLocaleString()}
                            </span> 개
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          검색 조건에 맞는 물품이 없거나 현재 사업장에 등록된 물품이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'form' && (
          <div className="item-tab-content">
            <div className="item-card">

              {/* 새로운 물품 등록과 기존 물품 등록의 입력 칸 구분을 위한 토글 헤더 */}
              <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFormType('new')}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderBottom: formType === 'new' ? '3px solid #4f46e5' : '3px solid transparent',
                    color: formType === 'new' ? '#4f46e5' : '#64748b',
                    fontWeight: '700',
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  🆕 새로운 물품 등록
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('existing')}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderBottom: formType === 'existing' ? '3px solid #4f46e5' : '3px solid transparent',
                    color: formType === 'existing' ? '#4f46e5' : '#64748b',
                    fontWeight: '700',
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  📦 기존 물품 등록
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="item-form">
                <div className="item-form-grid">

                  {/* 물품명 입력칸 분할 (새로운 물품은 직접 입력, 기존 물품은 DB 내 고유 이름 목록에서 선택) */}
                  <div className="item-form-group">
                    <label htmlFor="itemName">물품명 *</label>
                    {formType === 'new' ? (
                      <input
                        id="itemName"
                        type="text"
                        name="itemName"
                        className="item-input"
                        placeholder="예: 덤벨, 수건 등"
                        value={formData.itemName}
                        onChange={handleInputChange}
                        required
                      />
                    ) : (
                      <select
                        id="itemNameSelect"
                        className="item-select"
                        value={selectedExistingName}
                        onChange={(e) => setSelectedExistingName(e.target.value)}
                        required
                      >
                        <option value="">-- 기존 등록된 물품 선택 --</option>
                        {existingItemNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 카테고리 */}
                  <div className="item-form-group">
                    <label htmlFor="itemCategory">분류</label>
                    <select
                      id="itemCategory"
                      name="itemCategory"
                      className="item-select"
                      value={formData.itemCategory}
                      onChange={handleInputChange}
                    >
                      <option value="기구">기구</option>
                      <option value="소모품">소모품</option>
                      <option value="식품">식품</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>

                  {/* 구매일 */}
                  <div className="item-form-group">
                    <label htmlFor="itemBuy">구매일 *</label>
                    <input
                      id="itemBuy"
                      type="date"
                      name="itemBuy"
                      className="item-input"
                      value={formData.itemBuy}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* 가격 */}
                  <div className="item-form-group">
                    <label htmlFor="itemPrice">가격 (원)</label>
                    <input
                      id="itemPrice"
                      type="number"
                      name="itemPrice"
                      className="item-input"
                      placeholder="금액 입력"
                      value={formData.itemPrice}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>

                  {/* 갯수 */}
                  <div className="item-form-group">
                    <label htmlFor="itemCount">갯수 *</label>
                    <input
                      id="itemCount"
                      type="number"
                      name="itemCount"
                      className="item-input"
                      placeholder="개수 입력"
                      value={formData.itemCount}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>

                </div>

                <button type="submit" className="item-submit-btn">물품 등록하기</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="item-tab-content">
            <div className="item-card">
              <h2 className="item-card-title">바로가기 링크 (팀원 매핑 영역)</h2>
              <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>
                팀 프로젝트 작업 시 다른 개발자분이 실제 라우터 링크를 이곳에 연결할 예정입니다.
              </p>

              <div className="item-link-grid">
                <div className="item-link-card" onClick={() => alert('대시보드로 이동하는 링크 카드입니다. (경로 매핑 필요)')}>
                  <div className="item-link-title">
                    <span style={{ fontSize: '1.25rem' }}>📊</span>
                    관리자 대시보드
                  </div>
                  <div className="item-link-desc">
                    전체 통계, 주요 지표 및 최근 현황을 한눈에 볼 수 있는 관리자 대시보드로 이동합니다.
                  </div>
                  <div className="item-link-hint">
                    이동하기 ➔
                  </div>
                </div>

                <div className="item-link-card" onClick={() => alert('회원 관리 페이지로 이동하는 링크 카드입니다. (경로 매핑 필요)')}>
                  <div className="item-link-title">
                    <span style={{ fontSize: '1.25rem' }}>👥</span>
                    회원 관리
                  </div>
                  <div className="item-link-desc">
                    헬스장 등록 회원 목록 확인, 신규 등록 및 이용권 만료 기간을 관리하는 페이지로 이동합니다.
                  </div>
                  <div className="item-link-hint">
                    이동하기 ➔
                  </div>
                </div>

                <div className="item-link-card" onClick={() => alert('수업/예약 일정 관리 페이지로 이동하는 링크 카드입니다. (경로 매핑 필요)')}>
                  <div className="item-link-title">
                    <span style={{ fontSize: '1.25rem' }}>🗓️</span>
                    수업 및 예약 일정
                  </div>
                  <div className="item-link-desc">
                    트레이너별 피티 수업 스케줄 및 예약 현황을 조회하고 조율하는 페이지로 이동합니다.
                  </div>
                  <div className="item-link-hint">
                    이동하기 ➔
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Itempage;
