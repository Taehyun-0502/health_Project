import { useState, useEffect, useMemo } from 'react';
import './Itempage.css';
import { useSearchParams } from 'react-router-dom';
import Pagination from './Pagination';

function Itempage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'form' ? 'form' : 'list';
  const [selectedItem, setSelectedItem] = useState(null); // 선택된 상세 물품 상태
  const [detailList, setDetailList] = useState([]); // 선택된 물품의 상세 구매 이력 리스트

  // 수정 기능 상태 관리
  const [editingItem, setEditingItem] = useState(null); // 수정 중인 특정 물품 객체
  const [editFormData, setEditFormData] = useState({
    itemCategory: '기구',
    itemName: '',
    itemDate: '',
    itemPrice: '',
    itemCount: '',
    itemExpiryDate: ''
  });

  const setActiveTab = (view) => {
    const next = new URLSearchParams(searchParams);
    if (view === 'form') next.set('view', 'form');
    else next.delete('view');
    setSelectedItem(null);
    setEditingItem(null);
    setSearchParams(next);
  };

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
  const gymId = (() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.gymId || 1;
      } catch {
        return 1;
      }
    }
    return 1;
  })();



  // 검색어 상태 (서버 사이드 검색: 입력값이 바뀌면 keyword 파라미터로 서버에 재조회 요청)
  const [searchTerm, setSearchTerm] = useState('');

  // 정렬 옵션 상태 ('' = 기본(이름순), count_desc/count_asc/price_desc/price_asc)
  const [sortOption, setSortOption] = useState('');

  // 백엔드로부터 물품 리스트를 "현재 페이지 + 검색어 + 정렬" 조건으로 페이징 조회하는 API 호출
  // 응답 형태: { items: [...], pager: {...}, totalCount: n }
  const fetchItems = async (targetPage, keyword, sort) => {
    try {
      const query = new URLSearchParams({
        gymId,
        page: targetPage,
        pageSize,
        keyword: keyword || '',
        sort: sort || ''
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

  // gymId가 바뀌면 1페이지/검색어 초기화 상태로 목록과 자동완성 목록을 다시 조회 (정렬 옵션은 유지)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    setSearchTerm('');
    fetchItems(1, '', sortOption);
    fetchItemNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  // 검색어가 바뀔 때마다 300ms 디바운스 후 1페이지부터 재조회 (매 입력마다 요청이 나가는 것을 방지)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchItems(1, searchTerm, sortOption);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // 페이지네이션 버튼 클릭 시 즉시(디바운스 없이) 해당 페이지를 조회
  const handlePageChange = (targetPage) => {
    setPage(targetPage);
    fetchItems(targetPage, searchTerm, sortOption);
  };

  // 정렬 옵션 변경 시 1페이지로 이동해서 즉시 재조회 (state 갱신은 비동기라 새 값을 직접 넘겨줌)
  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSortOption(newSort);
    setPage(1);
    fetchItems(1, searchTerm, newSort);
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
      itemCount: (item.itemCount !== undefined ? item.itemCount : item.item_count) || 0,
      itemExpiryDate: item.itemExpiryDate || item.item_expiry_date || ''
    });
  };

  // 수정 정보 전송
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.itemName.trim()) {
      alert('물품명을 입력해주세요.');
      return;
    }
    if (!editFormData.itemCategory.trim()) {
      alert('분류를 입력해주세요.');
      return;
    }
    if (!editFormData.itemCount || parseInt(editFormData.itemCount, 10) <= 0) {
      alert('올바른 갯수를 입력해주세요.');
      return;
    }

    const updatedItem = {
      itemId: editingItem.itemId !== undefined ? editingItem.itemId : editingItem.item_id,
      gymId: gymId,
      itemCategory: editFormData.itemCategory.trim(),
      itemName: editFormData.itemName.trim(),
      itemDate: editFormData.itemDate || editFormData.itemBuy || '',
      itemPrice: editFormData.itemPrice ? parseInt(editFormData.itemPrice, 10) : 0,
      itemCount: parseInt(editFormData.itemCount, 10),
      itemExpiryDate: editFormData.itemExpiryDate || null
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
        fetchItems(page, searchTerm, sortOption); // 현재 보고 있던 페이지/검색어/정렬 조건 그대로 재조회
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
        fetchItems(page, searchTerm, sortOption); // 현재 보고 있던 페이지/검색어/정렬 조건 그대로 재조회
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

  const currentMonthKey = new Date().toISOString().split('T')[0].substring(0, 7);
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

    const totalCount = purchaseCount - disposalCount;
    return { totalCount, purchaseCount, disposalCount };
  }, [filteredDetails]);

  // 등록 폼 입력값 상태 관리 (ItemDTO 스펙과 변수명 100% 매칭)
  const [formData, setFormData] = useState({
    itemCategory: '기구',
    itemName: '',
    itemDate: new Date().toISOString().split('T')[0],
    itemPrice: '',
    itemCount: '',
    itemStatus: '구매', // '구매' | '폐기' 추가 (DTO의 itemStatus 스펙 매칭)
    itemExpiryDate: '' // 유효기간 (선택 입력, 임박 시 알림 배치 대상)
  });

  // 해당 사업장(gymId) 내 중복 제거된 물품명 리스트 (페이징된 items가 아닌 /names 전용 API 결과인 itemNames 기준)
  const existingItemNames = useMemo(() => {
    const names = itemNames.map(item => item.itemName).filter(Boolean);
    return Array.from(new Set(names));
  }, [itemNames]);

  // 카테고리 자동완성 후보: 기본 4종 + 이 사업장에서 실제 사용 중인 카테고리를 합침 (별도 관리 테이블 없이 물품 데이터에서 파생)
  const existingCategories = useMemo(() => {
    const base = ['기구', '소모품', '식품', '기타'];
    const used = itemNames.map(item => item.itemCategory).filter(Boolean);
    return Array.from(new Set([...base, ...used]));
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
    const finalItemCategory = formData.itemCategory.trim();

    if (!finalItemName) {
      alert('물품명을 입력하거나 선택해주세요.');
      return;
    }
    if (!finalItemCategory) {
      alert('분류를 입력하거나 선택해주세요.');
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
      itemCategory: finalItemCategory,
      itemName: finalItemName,
      itemDate: formData.itemDate,
      // 폐기인 경우 단가는 0원으로 자동 지정
      itemPrice: isDisposal ? 0 : (formData.itemPrice ? parseInt(formData.itemPrice, 10) : 0),
      // 폐기인 경우 DB 수량을 마이너스로 차감 저장
      itemCount: isDisposal ? -finalCount : finalCount,
      itemStatus: formData.itemStatus, // DTO의 itemStatus로 필드명 변경 전송
      itemExpiryDate: formData.itemExpiryDate || null
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
        fetchItems(1, searchTerm, sortOption); // 새로 등록된 물품을 확인할 수 있도록 1페이지부터 재조회
        fetchItemNames(); // 새 물품명이 자동완성 목록에 반영되도록 갱신

        // 폼 초기화 및 목록으로 돌아가기
        setFormData({
          itemCategory: '기구',
          itemName: '',
          itemDate: new Date().toISOString().split('T')[0],
          itemPrice: '',
          itemCount: '',
          itemStatus: '구매',
          itemExpiryDate: ''
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
      {/* 카테고리 자동완성 후보 목록: 등록/수정 폼 둘 다 list="item-category-options"로 참조하므로 탭 전환과 무관하게 항상 렌더링되는 위치에 둠 */}
      <datalist id="item-category-options">
        {existingCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <main className="item-content-area">
        {activeTab === 'list' && (
          <div className="item-tab-content">
            {editingItem ? (
              <div className="item-card">
                <div className="item-section-header">
                  <h2 className="item-card-title item-card-title--flush">물품 정보 수정</h2>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="item-secondary-btn"
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

                    {/* 카테고리: 자동완성 후보(existingCategories)에서 고르거나, 목록에 없는 새 카테고리를 직접 입력해 추가 가능 */}
                    <div className="item-form-group">
                      <label htmlFor="editItemCategory">분류</label>
                      <input
                        id="editItemCategory"
                        type="text"
                        name="itemCategory"
                        className="item-input"
                        list="item-category-options"
                        placeholder="분류 선택 또는 새로 입력"
                        value={editFormData.itemCategory}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemCategory: e.target.value }))}
                      />
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

                    {/* 유효기간 */}
                    <div className="item-form-group">
                      <label htmlFor="editItemExpiryDate">유효기간 (선택)</label>
                      <input
                        id="editItemExpiryDate"
                        type="date"
                        name="itemExpiryDate"
                        className="item-input"
                        value={editFormData.itemExpiryDate || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemExpiryDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="item-form-actions">
                    <button type="submit" className="item-submit-btn item-submit-btn--grow">수정 완료</button>
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="item-secondary-btn item-secondary-btn--grow"
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

                {/* 검색 바 + 정렬 옵션 + CSV 내보내기 버튼 */}
                <div className="item-search-bar">
                  <input
                    type="text"
                    className="item-search-input"
                    placeholder="물품명 또는 카테고리로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select className="item-sort-select" value={sortOption} onChange={handleSortChange}>
                    <option value="">기본순 (이름순)</option>
                    <option value="count_desc">수량 많은순</option>
                    <option value="count_asc">수량 적은순</option>
                    <option value="price_desc">가격 높은순</option>
                    <option value="price_asc">가격 낮은순</option>
                  </select>
                  <button type="button" className="item-export-btn" onClick={handleExportCsv}>
                    CSV 내보내기
                  </button>
                </div>

                {/* 테이블 목록 (분류, 물품명, 갯수, 최근 단가 출력) */}
                <div className="item-table-wrapper">
                  <table className="item-table">
                    <thead>
                      <tr>
                        <th>번호</th>
                        <th>분류</th>
                        <th>물품명</th>
                        <th>갯수</th>
                        <th>최근 단가</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length > 0 ? (
                        items.map((item, index) => (
                          // 행 클릭 = 우측 통합 드로어에 물품 탭 추가 (상세 보기 버튼은 stopPropagation으로 기존 동작 유지)
                          <tr
                            key={item.itemId || index}
                            className="is-clickable"
                            onClick={() =>
                              window.dispatchEvent(new CustomEvent('b2b-drawer-open', {
                                detail: { kind: 'item', id: item.itemId ?? item.itemName ?? index, title: item.itemName ?? '물품', data: item },
                              }))
                            }
                          >
                            {/* 페이지가 바뀌어도 전체 목록 기준 연속된 번호가 보이도록 offset + index로 계산 */}
                            <td>{(pager?.offset || 0) + index + 1}</td>
                            <td>
                              <span className="item-category-badge">
                                {item.itemCategory}
                              </span>
                            </td>
                            <td className="item-table__name">
                              <button
                                type="button"
                                className="item-table__detail-button"
                                onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                              >
                                {item.itemName}
                              </button>
                            </td>
                            <td>
                              <span className="item-table__count">
                                {item.itemCount.toLocaleString()}
                              </span> 개
                            </td>
                            <td>
                              {item.itemPrice != null ? `${item.itemPrice.toLocaleString()} 원` : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="item-table__empty">
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
                <div className="item-section-header">
                  <div>
                    <span className="item-category-badge item-category-badge--large">
                      {selectedItem.itemCategory}
                    </span>
                    <h2 className="item-card-title item-card-title--inline">
                      {selectedItem.itemName} 상세 정보
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="item-secondary-btn"
                  >
                    ← 목록으로 돌아가기
                  </button>
                </div>

                {/* 요약 카드 그리드 */}
                <div className="item-summary-grid">
                  <div className="item-summary-card">
                    <div className="item-summary-card__label">
                      {selectedMonthFilter === 'all' ? '전체 기간 총 갯수' : '선택 월 총 갯수'}
                    </div>
                    <div className="item-summary-card__value">
                      {currentStats.totalCount.toLocaleString()} 개
                    </div>
                  </div>
                  <div className="item-summary-card">
                    <div className="item-summary-card__label">
                      {selectedMonthFilter === 'all' ? '전체 기간 구매 갯수' : '선택 월 구매 갯수'}
                    </div>
                    <div className="item-summary-card__value item-summary-card__value--success">
                      {currentStats.purchaseCount.toLocaleString()} 개
                    </div>
                  </div>
                  <div className="item-summary-card">
                    <div className="item-summary-card__label">
                      {selectedMonthFilter === 'all' ? '전체 기간 폐기 갯수' : '선택 월 폐기 갯수'}
                    </div>
                    <div className="item-summary-card__value item-summary-card__value--danger">
                      {currentStats.disposalCount.toLocaleString()} 개
                    </div>
                  </div>
                </div>

                {/* 상세 내역 필터바 영역 */}
                <div className="item-detail-toolbar">
                  <h3>
                    📦 등록 및 관리 내역 리스트 ({detailList.length}건)
                  </h3>

                  {/* 월별 필터 셀렉트 */}
                  <label className="item-month-filter">
                    <span>조회 월 선택:</span>
                    <select
                      value={selectedMonthFilter}
                      onChange={(e) => setSelectedMonthFilter(e.target.value)}
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
                  </label>
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
                              <td className="item-table__muted">#{id}</td>
                              <td>
                                <span className={`item-status-badge ${isDisposal ? 'is-disposal' : 'is-purchase'}`}>
                                  {isDisposal ? '폐기' : '구매'}
                                </span>
                              </td>
                              <td className="item-table__date">{buyDate}</td>
                              <td className="item-table__amount">{isDisposal ? '-' : (price ? `${price.toLocaleString()} 원` : '0 원')}</td>
                              <td className={`item-table__quantity ${isDisposal ? 'is-disposal' : ''}`}>
                                {isDisposal ? `-${displayCount} 개` : `${displayCount} 개`}
                              </td>
                              <td className="item-table__amount item-table__amount--strong">
                                {isDisposal ? '-' : `${totalPrice.toLocaleString()} 원`}
                              </td>
                              <td>
                                <div className="item-row-actions">
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="item-row-action"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(item)}
                                    className="item-row-action item-row-action--danger"
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
                  <div className="item-detail-empty">
                    {selectedMonthFilter === 'all'
                      ? '등록된 상세 내역이 없습니다.'
                      : `${selectedMonthFilter.substring(0, 4)}년 ${selectedMonthFilter.substring(5, 7)}월에 등록된 내역이 없습니다.`}
                    <div className="item-detail-empty__hint">
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
              <h2 className="item-card-title">물품 등록</h2>
              <form onSubmit={handleFormSubmit} className="item-form">
                <div className="item-form-grid">

                  {/* 물품명 입력칸 (직접 입력하거나 기존 목록에서 선택) */}
                  <div className="item-form-group full-width">
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
                      <div className="item-suggestions">
                        <div className="item-suggestions__label">
                          💡 내가 등록한 전체 물품 목록 (클릭 시 자동 입력):
                        </div>
                        <div className="item-suggestions__list">
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
                                className={`item-suggestion${isSelected ? ' is-selected' : ''}`}
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

                  {/* 카테고리: 자동완성 후보(existingCategories)에서 고르거나, 목록에 없는 새 카테고리를 직접 입력해 추가 가능 */}
                  <div className="item-form-group">
                    <label htmlFor="itemCategory">분류</label>
                    <input
                      id="itemCategory"
                      type="text"
                      name="itemCategory"
                      className="item-input"
                      list="item-category-options"
                      placeholder="분류 선택 또는 새로 입력"
                      value={formData.itemCategory}
                      onChange={handleInputChange}
                    />
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

                  {/* 유효기간: 선택 입력, 만료 3일 전 사장님에게 알림 발송 */}
                  <div className="item-form-group">
                    <label htmlFor="itemExpiryDate">유효기간 (선택)</label>
                    <input
                      id="itemExpiryDate"
                      type="date"
                      name="itemExpiryDate"
                      className="item-input"
                      value={formData.itemExpiryDate}
                      onChange={handleInputChange}
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
