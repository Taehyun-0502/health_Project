import React, { useState, useEffect, useMemo } from 'react';
import './Itempage.css';
import { Link } from 'react-router-dom';
import Pagination from './Pagination';
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
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'form'
  const [selectedItem, setSelectedItem] = useState(null); // 선택된 상세 물품 상태
  const [detailList, setDetailList] = useState([]); // 선택된 물품의 상세 구매 이력 리스트

  // 수정 기능 상태 관리
  const [editingItem, setEditingItem] = useState(null); // 수정 중인 특정 물품 객체
  const [editFormData, setEditFormData] = useState({
    itemCategory: '기구',
    itemName: '',
    itemDate: '',
    itemPrice: '',
    itemCount: ''
  });

  // 현재 페이지에 표시할 물품 데이터 목록 (서버가 gymId+검색어+페이지 조건으로 이미 필터링/페이징해서 내려줌)
  const [items, setItems] = useState([]);

  // 서버에서 내려주는 페이징 정보 (currentPage, startPage, endPage, hasPrev, hasNext 등 - Pager.java와 동일 구조)
  const [pager, setPager] = useState(null);

  // 현재 조회 중인 페이지 번호 (1부터 시작)
  const [page, setPage] = useState(1);

  // 한 페이지당 표시 개수
  const pageSize = 10;

  // 물품 등록 폼 자동완성용 물품명 목록 (페이징과 무관하게 해당 gym의 전체 물품명을 별도 API로 조회)
  const [itemNames, setItemNames] = useState([]);

  // 로그인된 유저의 사업장 id (localStorage에서 조회, 없을 시 기본값 1)
  const [gymId, setGymId] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.gymId || 1;
      } catch (e) {
        return 1;
      }
    }
    return 1;
  });

  const [loading, setLoading] = useState(false);

  // 검색어 상태 (서버 사이드 검색: 입력값이 바뀌면 keyword 파라미터로 서버에 재조회 요청)
  const [searchTerm, setSearchTerm] = useState('');

  // 백엔드로부터 물품 리스트를 "현재 페이지 + 검색어" 조건으로 페이징 조회하는 API 호출
  // 응답 형태: { items: [...], pager: {...}, totalCount: n }
  const fetchItems = async (targetPage, keyword) => {
    try {
      const query = new URLSearchParams({
        gymId,
        page: targetPage,
        pageSize,
        keyword: keyword || ''
      });
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/list?${query.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        setPager(data.pager || null);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  // 물품 등록 폼 자동완성용 물품명 전체 목록 조회 API 호출 (페이징 없이 gym 전체)
  const fetchItemNames = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/names?gymId=${gymId}`);
      if (response.ok) {
        setItemNames(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch item names:', error);
    }
  };

  // gymId가 바뀌면 1페이지/검색어 초기화 상태로 목록과 자동완성 목록을 다시 조회
  useEffect(() => {
    setPage(1);
    setSearchTerm('');
    fetchItems(1, '');
    fetchItemNames();
  }, [gymId]);

  // 검색어가 바뀔 때마다 300ms 디바운스 후 1페이지부터 재조회 (매 입력마다 요청이 나가는 것을 방지)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchItems(1, searchTerm);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // 페이지네이션 버튼 클릭 시 즉시(디바운스 없이) 해당 페이지를 조회
  const handlePageChange = (targetPage) => {
    setPage(targetPage);
    fetchItems(targetPage, searchTerm);
  };

  // CSV 필드값에 쉼표/줄바꿈/큰따옴표가 섞여 있어도 깨지지 않도록 이스케이프
  const escapeCsvField = (value) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // CSV 내보내기: 현재 검색어 조건을 반영한 전체 목록을 서버에서 받아와 CSV 파일로 다운로드 (페이징 무시, 전체 건수)
  const handleExportCsv = async () => {
    try {
      const query = new URLSearchParams({ gymId, keyword: searchTerm || '' });
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/export?${query.toString()}`);
      if (!response.ok) {
        alert('내보내기에 실패했습니다.');
        return;
      }

      const allItems = await response.json();
      if (allItems.length === 0) {
        alert('내보낼 물품이 없습니다.');
        return;
      }

      const header = ['번호', '분류', '물품명', '갯수'];
      const rows = allItems.map((item, index) => [index + 1, item.itemCategory, item.itemName, item.itemCount]);
      const csvContent = [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\r\n');

      // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 파일 맨 앞에 붙임
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `물품목록_${gymId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('내보내기 중 오류가 발생했습니다.');
    }
  };

  // 백엔드로부터 특정 물품의 상세 구매 이력 조회 API 호출
  const handleItemClick = async (item) => {
    setSelectedItem(item);
    setDetailList([]);
    setSelectedMonthFilter(currentMonthKey); // 상세 클릭 시 항상 이번 달 필터로 리셋
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/detail?gymId=${gymId}&itemName=${encodeURIComponent(item.itemName)}`);
      if (response.ok) {
        setDetailList(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch item details:', error);
    }
  };

  // 수정 버튼 클릭 시 폼 바인딩
  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditFormData({
      itemCategory: item.itemCategory || item.item_category || '기구',
      itemName: item.itemName || item.item_name || '',
      itemDate: item.itemDate || item.item_date || item.itemBuy || item.item_buy || '',
      itemPrice: (item.itemPrice !== undefined ? item.itemPrice : item.item_price) || 0,
      itemCount: (item.itemCount !== undefined ? item.itemCount : item.item_count) || 0
    });
  };

  // 수정 정보 전송
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.itemName.trim()) {
      alert('물품명을 입력해주세요.');
      return;
    }
    if (!editFormData.itemCount || parseInt(editFormData.itemCount, 10) <= 0) {
      alert('올바른 갯수를 입력해주세요.');
      return;
    }

    const updatedItem = {
      itemId: editingItem.itemId !== undefined ? editingItem.itemId : editingItem.item_id,
      gymId: gymId,
      itemCategory: editFormData.itemCategory,
      itemName: editFormData.itemName.trim(),
      itemDate: editFormData.itemDate || editFormData.itemBuy || '',
      itemPrice: editFormData.itemPrice ? parseInt(editFormData.itemPrice, 10) : 0,
      itemCount: parseInt(editFormData.itemCount, 10)
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedItem)
      });

      if (response.ok) {
        alert('물품 정보가 성공적으로 수정되었습니다.');
        fetchItems(page, searchTerm); // 현재 보고 있던 페이지/검색어 조건 그대로 재조회
        fetchItemNames(); // 물품명이 바뀌었을 수 있으므로 자동완성 목록도 갱신
        handleItemClick(updatedItem); // 수정한 데이터 이름 기준으로 목록 새로고침 및 갱신
        setEditingItem(null);
      } else {
        alert('물품 정보 수정에 실패하였습니다.');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 물품 삭제 요청
  const handleDeleteClick = async (item) => {
    if (!window.confirm('정말로 이 물품 항목을 삭제하시겠습니까?')) {
      return;
    }

    const payload = {
      itemId: item.itemId !== undefined ? item.itemId : item.item_id,
      gymId: gymId,
      itemName: item.itemName || item.item_name || ''
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('물품이 삭제되었습니다.');
        fetchItems(page, searchTerm); // 현재 보고 있던 페이지/검색어 조건 그대로 재조회
        fetchItemNames(); // 해당 물품명의 이력이 전부 삭제됐을 수 있으므로 자동완성 목록도 갱신
        const deletedId = item.itemId !== undefined ? item.itemId : item.item_id;
        setDetailList(prev => {
          const remaining = prev.filter(d => {
            const dId = d.itemId !== undefined ? d.itemId : d.item_id;
            return dId !== deletedId;
          });
          if (remaining.length === 0) {
            setSelectedItem(null);
          }
          return remaining;
        });
      } else {
        alert('물품 삭제에 실패하였습니다.');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  const currentMonthKey = useMemo(() => new Date().toISOString().split('T')[0].substring(0, 7), []);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(currentMonthKey);

  // 조회 월 선택 옵션: 실제 이력 존재 여부와 무관하게 올해(현재 연도) 1월~12월을 항상 전부 제공
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);
  }, [currentYear]);

  // 선택된 월 기준 필터링된 상세 내역
  const filteredDetails = useMemo(() => {
    if (selectedMonthFilter === 'all') {
      return detailList;
    }
    return detailList.filter((item) => {
      const buyDate = item.itemDate || item.item_date || item.item_Date || item.itemBuy || item.item_buy;
      return buyDate && buyDate.substring(0, 7) === selectedMonthFilter;
    });
  }, [detailList, selectedMonthFilter]);

  // 선택된 필터 기준 통계 계산 (총 갯수, 구매 갯수, 폐기 갯수)
  const currentStats = useMemo(() => {
    let totalCount = 0; // 해당 월(또는 전체)의 총 수량 (구매 - 폐기)
    let purchaseCount = 0; // 해당 월(또는 전체)의 총 구매 수량
    let disposalCount = 0; // 해당 월(또는 전체)의 총 폐기 수량

    filteredDetails.forEach((item) => {
      const count = item.itemCount !== undefined ? item.itemCount : item.item_count || 0;
      const isDisposal = item.itemStatus === '폐기' || item.item_status === '폐기' || count < 0;
      const displayCount = Math.abs(count);

      if (isDisposal) {
        disposalCount += displayCount;
      } else {
        purchaseCount += displayCount;
      }
    });

    totalCount = purchaseCount - disposalCount;

    return { totalCount, purchaseCount, disposalCount };
  }, [filteredDetails]);

  // 등록 폼 입력값 상태 관리 (ItemDTO 스펙과 변수명 100% 매칭)
  const [formData, setFormData] = useState({
    itemCategory: '기구',
    itemName: '',
    itemDate: new Date().toISOString().split('T')[0],
    itemPrice: '',
    itemCount: '',
    itemStatus: '구매' // '구매' | '폐기' 추가 (DTO의 itemStatus 스펙 매칭)
  });

  // 해당 사업장(gymId) 내 중복 제거된 물품명 리스트 (페이징된 items가 아닌 /names 전용 API 결과인 itemNames 기준)
  const existingItemNames = useMemo(() => {
    const names = itemNames.map(item => item.itemName).filter(Boolean);
    return Array.from(new Set(names));
  }, [itemNames]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 물품명 입력 변경 처리 (기존 품목 매핑 기능 포함)
  const handleItemNameChange = (e) => {
    const value = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, itemName: value };
      // 기존에 등록된 물품 중 명칭이 일치하는 것이 있다면 카테고리를 자동 선택
      const matchedItem = itemNames.find(item => item.itemName === value);
      if (matchedItem) {
        updated.itemCategory = matchedItem.itemCategory;
      }
      return updated;
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const finalItemName = formData.itemName.trim();

    if (!finalItemName) {
      alert('물품명을 입력하거나 선택해주세요.');
      return;
    }
    if (!formData.itemCount || parseInt(formData.itemCount, 10) <= 0) {
      alert('올바른 갯수를 입력해주세요.');
      return;
    }

    const isDisposal = formData.itemStatus === '폐기';
    const finalCount = parseInt(formData.itemCount, 10);
    const newItem = {
      itemId: 0,
      gymId: gymId,
      itemCategory: formData.itemCategory,
      itemName: finalItemName,
      itemDate: formData.itemDate,
      // 폐기인 경우 단가는 0원으로 자동 지정
      itemPrice: isDisposal ? 0 : (formData.itemPrice ? parseInt(formData.itemPrice, 10) : 0),
      // 폐기인 경우 DB 수량을 마이너스로 차감 저장
      itemCount: isDisposal ? -finalCount : finalCount,
      itemStatus: formData.itemStatus // DTO의 itemStatus로 필드명 변경 전송
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
        setPage(1);
        fetchItems(1, searchTerm); // 새로 등록된 물품을 확인할 수 있도록 1페이지부터 재조회
        fetchItemNames(); // 새 물품명이 자동완성 목록에 반영되도록 갱신

        // 폼 초기화 및 목록으로 돌아가기
        setFormData({
          itemCategory: '기구',
          itemName: '',
          itemDate: new Date().toISOString().split('T')[0],
          itemPrice: '',
          itemCount: '',
          itemStatus: '구매'
        });
        setActiveTab('list');
      } else {
        alert('물품 등록에 실패하였습니다.');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // gymId/검색어/페이지 조건은 이미 서버에서 반영되어 items에 현재 페이지 분량만 담겨 오므로 그대로 사용
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
                onClick={() => { setSelectedItem(null); setEditingItem(null); setActiveTab('list'); }}
              >
                <ListIcon />
                물품 목록
              </button>
            </li>
            <li>
              <button
                className={`item-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                onClick={() => { setSelectedItem(null); setEditingItem(null); setActiveTab('form'); }}
              >
                <FormIcon />
                물품 등록
              </button>
            </li>
            <li>
              <Link
                to="/fitb"
                className="item-tab-btn"
                style={{ textDecoration: 'none' }}
              >
                <LinksIcon />
                대시보드로 가기
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* 우측 상세 컨텐츠 영역 */}
      <main className="item-content-area">
        {activeTab === 'list' && (
          <div className="item-tab-content">
            {editingItem ? (
              <div className="item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <h2 className="item-card-title" style={{ margin: 0 }}>물품 정보 수정</h2>
                  <button
                    onClick={() => setEditingItem(null)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                  >
                    취소
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="item-form">
                  <div className="item-form-grid">
                    {/* 물품명 */}
                    <div className="item-form-group">
                      <label htmlFor="editItemName">물품명 *</label>
                      <input
                        id="editItemName"
                        type="text"
                        name="itemName"
                        className="item-input"
                        value={editFormData.itemName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemName: e.target.value }))}
                        required
                      />
                    </div>

                    {/* 카테고리 */}
                    <div className="item-form-group">
                      <label htmlFor="editItemCategory">분류</label>
                      <select
                        id="editItemCategory"
                        name="itemCategory"
                        className="item-select"
                        value={editFormData.itemCategory}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemCategory: e.target.value }))}
                      >
                        <option value="기구">기구</option>
                        <option value="소모품">소모품</option>
                        <option value="식품">식품</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>

                    {/* 등록일 */}
                    <div className="item-form-group">
                      <label htmlFor="editItemDate">등록일 (수정 불가)</label>
                      <input
                        id="editItemDate"
                        type="date"
                        name="itemDate"
                        className="item-input"
                        value={editFormData.itemDate || editFormData.itemBuy || ''}
                        disabled
                        style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#94a3b8' }}
                      />
                    </div>

                    {/* 가격 */}
                    <div className="item-form-group">
                      <label htmlFor="editItemPrice">가격 (원)</label>
                      <input
                        id="editItemPrice"
                        type="number"
                        name="itemPrice"
                        className="item-input"
                        value={editFormData.itemPrice}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemPrice: e.target.value }))}
                        min="0"
                      />
                    </div>

                    {/* 갯수 */}
                    <div className="item-form-group">
                      <label htmlFor="editItemCount">갯수 *</label>
                      <input
                        id="editItemCount"
                        type="number"
                        name="itemCount"
                        className="item-input"
                        value={editFormData.itemCount}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemCount: e.target.value }))}
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="item-submit-btn" style={{ flex: 1 }}>수정 완료</button>
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            ) : !selectedItem ? (
              <div className="item-card">
                <h2 className="item-card-title">등록된 물품 목록</h2>

                {/* 실제 운영 시에는 로그인 정보(gymId)에 따라 고정됩니다. */}

                {/* 검색 바 + CSV 내보내기 버튼 */}
                <div className="item-search-bar">
                  <input
                    type="text"
                    className="item-search-input"
                    placeholder="물품명 또는 카테고리로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button type="button" className="item-export-btn" onClick={handleExportCsv}>
                    CSV 내보내기
                  </button>
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
                      {items.length > 0 ? (
                        items.map((item, index) => (
                          <tr
                            key={item.itemId || index}
                            onClick={() => handleItemClick(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* 페이지가 바뀌어도 전체 목록 기준 연속된 번호가 보이도록 offset + index로 계산 */}
                            <td>{(pager?.offset || 0) + index + 1}</td>
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

                {/* 물품 목록 하단 페이지네이션 */}
                <Pagination pager={pager} onPageChange={handlePageChange} />
              </div>
            ) : (
              <div className="item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      backgroundColor: '#e0e7ff',
                      color: '#4f46e5',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      marginRight: '0.75rem',
                      display: 'inline-block',
                      verticalAlign: 'middle'
                    }}>
                      {selectedItem.itemCategory}
                    </span>
                    <h2 className="item-card-title" style={{ margin: 0, display: 'inline-block', verticalAlign: 'middle' }}>
                      {selectedItem.itemName} 상세 정보
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                  >
                    ← 목록으로 돌아가기
                  </button>
                </div>

                {/* 요약 카드 그리드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '600' }}>
                      {selectedMonthFilter === 'all' ? '전체 기간 총 갯수' : '선택 월 총 갯수'}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#4f46e5' }}>
                      {currentStats.totalCount.toLocaleString()} 개
                    </div>
                  </div>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '600' }}>
                      {selectedMonthFilter === 'all' ? '전체 기간 구매 갯수' : '선택 월 구매 갯수'}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#16a34a' }}>
                      {currentStats.purchaseCount.toLocaleString()} 개
                    </div>
                  </div>
                  <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '600' }}>
                      {selectedMonthFilter === 'all' ? '전체 기간 폐기 갯수' : '선택 월 폐기 갯수'}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>
                      {currentStats.disposalCount.toLocaleString()} 개
                    </div>
                  </div>
                </div>

                {/* 상세 내역 필터바 영역 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                    📦 등록 및 관리 내역 리스트 ({detailList.length}건)
                  </h3>

                  {/* 월별 필터 셀렉트 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>조회 월 선택:</span>
                    <select
                      value={selectedMonthFilter}
                      onChange={(e) => setSelectedMonthFilter(e.target.value)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#334155',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s'
                      }}
                    >
                      <option value="all">전체 내역</option>
                      {availableMonths.map(m => {
                        const isCurrent = m === currentMonthKey;
                        return (
                          <option key={m} value={m}>
                            {m.substring(0, 4)}년 {m.substring(5, 7)}월 {isCurrent ? '(이번 달)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {filteredDetails.length > 0 ? (
                  <div className="item-table-wrapper">
                    <table className="item-table">
                      <thead>
                        <tr>
                          <th>물품 ID</th>
                          <th>구분</th>
                          <th>등록일자</th>
                          <th>단가 (가격)</th>
                          <th>수량</th>
                          <th>합계 금액</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDetails.map((item) => {
                          const id = item.itemId !== undefined ? item.itemId : item.item_id;
                          const buyDate = item.itemDate || item.item_date || item.itemBuy || item.item_buy || '-';
                          const price = item.itemPrice !== undefined ? item.itemPrice : item.item_price;
                          const count = item.itemCount !== undefined ? item.itemCount : item.item_count;

                          const isDisposal = item.itemStatus === '폐기' || item.item_status === '폐기' || count < 0;
                          const displayCount = Math.abs(count);
                          const totalPrice = (price || 0) * displayCount;

                          return (
                            <tr key={id}>
                              <td style={{ fontWeight: '500', color: '#64748b' }}>#{id}</td>
                              <td>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  backgroundColor: isDisposal ? '#fee2e2' : '#dcfce7',
                                  color: isDisposal ? '#ef4444' : '#16a34a'
                                }}>
                                  {isDisposal ? '폐기' : '구매'}
                                </span>
                              </td>
                              <td style={{ fontWeight: '600', color: '#334155' }}>{buyDate}</td>
                              <td style={{ color: '#0f172a' }}>{isDisposal ? '-' : (price ? `${price.toLocaleString()} 원` : '0 원')}</td>
                              <td style={{ fontWeight: '700', color: isDisposal ? '#ef4444' : '#4f46e5' }}>
                                {isDisposal ? `-${displayCount} 개` : `${displayCount} 개`}
                              </td>
                              <td style={{ fontWeight: '700', color: '#0f172a' }}>
                                {isDisposal ? '-' : `${totalPrice.toLocaleString()} 원`}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      borderRadius: '4px',
                                      backgroundColor: '#e2e8f0',
                                      color: '#334155',
                                      border: 'none',
                                      fontWeight: '600',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#cbd5e1'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(item)}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      borderRadius: '4px',
                                      backgroundColor: '#fee2e2',
                                      color: '#ef4444',
                                      border: 'none',
                                      fontWeight: '600',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#fca5a5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#fee2e2'}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
                    {selectedMonthFilter === 'all'
                      ? '등록된 상세 내역이 없습니다.'
                      : `${selectedMonthFilter.substring(0, 4)}년 ${selectedMonthFilter.substring(5, 7)}월에 등록된 내역이 없습니다.`}
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                      (상단의 '조회 월 선택'에서 다른 월을 고르거나 전체 내역을 볼 수 있습니다.)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'form' && (
          <div className="item-tab-content">
            <div className="item-card">
              <h2 className="item-card-title" style={{ marginBottom: '1.5rem' }}>물품 등록</h2>
              <form onSubmit={handleFormSubmit} className="item-form">
                <div className="item-form-grid">

                  {/* 물품명 입력칸 (직접 입력하거나 기존 목록에서 선택) */}
                  <div className="item-form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="itemName">물품명 *</label>
                    <input
                      id="itemName"
                      type="text"
                      name="itemName"
                      className="item-input"
                      placeholder="물품명을 직접 입력하거나 아래 추천 품목에서 선택하세요..."
                      value={formData.itemName}
                      onChange={handleItemNameChange}
                      required
                    />
                    {existingItemNames.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: '600' }}>
                          💡 내가 등록한 전체 물품 목록 (클릭 시 자동 입력):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {existingItemNames.map((name) => {
                            const isSelected = formData.itemName === name;
                            const matchedItem = itemNames.find(item => item.itemName === name);

                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    itemName: name,
                                    itemCategory: matchedItem ? matchedItem.itemCategory : prev.itemCategory
                                  }));
                                }}
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: isSelected ? '#e0e7ff' : '#f1f5f9',
                                  color: isSelected ? '#4f46e5' : '#475569',
                                  fontWeight: '600',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  outline: 'none'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.target.style.backgroundColor = '#e2e8f0';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.target.style.backgroundColor = '#f1f5f9';
                                  }
                                }}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 구분 (구매 / 폐기) */}
                  <div className="item-form-group">
                    <label htmlFor="itemStatus">구분 *</label>
                    <select
                      id="itemStatus"
                      name="itemStatus"
                      className="item-select"
                      value={formData.itemStatus}
                      onChange={handleInputChange}
                    >
                      <option value="구매">구매 (입고)</option>
                      <option value="폐기">폐기 (출고)</option>
                    </select>
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

                  {/* 등록일 */}
                  <div className="item-form-group">
                    <label htmlFor="itemDate">등록일 *</label>
                    <input
                      id="itemDate"
                      type="date"
                      name="itemDate"
                      className="item-input"
                      value={formData.itemDate}
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


      </main>
    </div>
  );
}

export default Itempage;
