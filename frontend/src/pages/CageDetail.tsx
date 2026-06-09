import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, Input, Select, Modal, message,
  Descriptions, Progress, Typography, Tooltip, Popconfirm, Alert,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, SearchOutlined,
  DeleteOutlined, WarningOutlined,
} from '@ant-design/icons';
import { cageApi } from '../api';

const { Option } = Select;

const statusOptions = [
  { value: 'idle', label: '空闲', color: 'default' },
  { value: 'in_use', label: '使用中', color: 'processing' },
  { value: 'full', label: '满员', color: 'error' },
  { value: 'maintenance', label: '维护中', color: 'warning' },
];

const animalStatusOptions = [
  { value: 'healthy', label: '健康', color: 'success' },
  { value: 'sick', label: '患病', color: 'error' },
  { value: 'in_experiment', label: '实验中', color: 'processing' },
  { value: 'deceased', label: '已死亡', color: 'default' },
  { value: 'quarantine', label: '隔离中', color: 'warning' },
];

const CageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cageDetail, setCageDetail] = useState<any>(null);
  const [animals, setAnimals] = useState<any[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [availableAnimals, setAvailableAnimals] = useState<any[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [searchingAnimals, setSearchingAnimals] = useState(false);

  const cageId = id ? parseInt(id, 10) : 0;

  const fetchCageDetail = useCallback(async () => {
    if (!cageId) return;
    try {
      setLoading(true);
      const res: any = await cageApi.getDetail(cageId);
      setCageDetail(res);
      setAnimals(res.animals || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [cageId]);

  useEffect(() => {
    fetchCageDetail();
  }, [fetchCageDetail]);

  const fetchAvailableAnimals = useCallback(async () => {
    try {
      setSearchingAnimals(true);
      const res: any = await cageApi.getAvailableAnimals(searchKeyword || undefined);
      setAvailableAnimals(Array.isArray(res) ? res : []);
    } catch {
    } finally {
      setSearchingAnimals(false);
    }
  }, [searchKeyword]);

  const handleAddAnimal = () => {
    setSelectedAnimalId(null);
    setSearchKeyword('');
    setAvailableAnimals([]);
    setAddModalVisible(true);
  };

  const handleSearchAnimals = () => {
    fetchAvailableAnimals();
  };

  const handleConfirmAdd = async () => {
    if (!selectedAnimalId) {
      message.warning('请选择要分配的动物');
      return;
    }
    try {
      await cageApi.addAnimal(cageId, selectedAnimalId);
      message.success('分配成功');
      setAddModalVisible(false);
      fetchCageDetail();
    } catch {
    }
  };

  const handleRemoveAnimal = async (animalId: number) => {
    try {
      await cageApi.removeAnimal(cageId, animalId);
      message.success('移出成功');
      fetchCageDetail();
    } catch {
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 100) return 'error';
    if (rate >= 80) return 'warning';
    return 'success';
  };

  const isNearFull = cageDetail && cageDetail.currentCount / cageDetail.maxCapacity >= 0.8;
  const isFull = cageDetail && cageDetail.currentCount >= cageDetail.maxCapacity;
  const isMaintenance = cageDetail && cageDetail.status === 'maintenance';

  const columns = [
    {
      title: '动物编号',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    { title: '物种', dataIndex: 'species', key: 'species', width: 100 },
    { title: '品系', dataIndex: 'breed', key: 'breed', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const opt = animalStatusOptions.find(o => o.value === status);
        return <Tag color={opt?.color}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Popconfirm
          title="确定将该动物移出笼舍吗？"
          onConfirm={() => handleRemoveAnimal(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Tooltip title="移出笼舍">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              移出
            </Button>
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/cages')}>
          返回列表
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          笼舍详情 - {cageDetail?.code || ''}
        </Typography.Title>
      </div>

      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}
        loading={loading}
      >
        {cageDetail && (
          <>
            {isMaintenance && (
              <Alert
                message="笼舍维护中"
                description="该笼舍当前处于维护状态，无法分配动物"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            {isFull && (
              <Alert
                message="笼舍已满"
                description="该笼舍已达到最大容量，无法继续添加动物"
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            {!isFull && isNearFull && (
              <Alert
                message="笼舍即将满员"
                description={`当前已饲养 ${cageDetail.currentCount} 只，最大容量 ${cageDetail.maxCapacity} 只，请合理安排`}
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}

            <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
              <Descriptions.Item label="笼舍编号">{cageDetail.code}</Descriptions.Item>
              <Descriptions.Item label="所在房间">{cageDetail.room}</Descriptions.Item>
              <Descriptions.Item label="笼舍类型">{cageDetail.type}</Descriptions.Item>
              <Descriptions.Item label="最大容量">{cageDetail.maxCapacity} 只</Descriptions.Item>
              <Descriptions.Item label="当前数量">
                <Space size="small">
                  <span style={{ fontWeight: isFull ? 700 : 500, color: isFull ? '#ff4d4f' : 'inherit' }}>
                    {cageDetail.currentCount} 只
                  </span>
                  {isNearFull && !isFull && (
                    <Tooltip title="即将满员"><WarningOutlined style={{ color: '#faad14' }} /></Tooltip>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusOptions.find(o => o.value === cageDetail.status)?.color}>
                  {statusOptions.find(o => o.value === cageDetail.status)?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="占用率" span={3}>
                <Progress
                  percent={cageDetail.occupancyRate}
                  status={isFull ? 'exception' : 'active'}
                  strokeColor={getOccupancyColor(cageDetail.occupancyRate)}
                  format={(percent) => `${percent?.toFixed(1)}% (${cageDetail.currentCount}/${cageDetail.maxCapacity})`}
                />
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={3}>
                {cageDetail.description || '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        title={<span style={{ fontWeight: 600 }}>笼内动物</span>}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddAnimal}
            disabled={isFull || isMaintenance}
          >
            分配动物
          </Button>
        }
      >
        <Table
          loading={loading}
          dataSource={animals.filter((a: any) => a.status !== 'deceased')}
          columns={columns}
          rowKey="id"
          scroll={{ x: 600 }}
          pagination={false}
          locale={{ emptyText: '该笼舍暂无动物' }}
        />
      </Card>

      <Modal
        title="分配动物到笼舍"
        open={addModalVisible}
        onOk={handleConfirmAdd}
        onCancel={() => setAddModalVisible(false)}
        width={600}
        okText="确认分配"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="搜索动物编号"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearchAnimals}
              allowClear
            />
            <Button type="primary" onClick={handleSearchAnimals} loading={searchingAnimals}>
              搜索
            </Button>
          </Space.Compact>
        </div>

        <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
          请选择要分配的动物（仅显示未分配笼舍的动物）
        </div>

        <Select
          style={{ width: '100%' }}
          placeholder="选择动物"
          value={selectedAnimalId}
          onChange={(v) => setSelectedAnimalId(v)}
          showSearch={false}
          listHeight={256}
          notFoundContent={searchingAnimals ? '搜索中...' : '暂无可用动物，请先搜索'}
        >
          {availableAnimals.map((animal: any) => (
            <Option key={animal.id} value={animal.id}>
              {animal.name} - {animal.species} ({animalStatusOptions.find(o => o.value === animal.status)?.label})
            </Option>
          ))}
        </Select>

        {cageDetail && (
          <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
            <div style={{ fontSize: 13, color: '#52c41a' }}>
              笼舍容量：{cageDetail.currentCount} / {cageDetail.maxCapacity}（剩余 {cageDetail.maxCapacity - cageDetail.currentCount} 个位置）
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CageDetail;
