import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, Input, Select, Modal,
  message, Popconfirm, Descriptions, Typography, Progress, Alert,
  Row, Col, Statistic, Tooltip, Empty, Spin,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, SearchOutlined,
  DeleteOutlined, ReloadOutlined, WarningOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { cageApi } from '../api';

const { Option } = Select;
const { Title, Text } = Typography;

const animalStatusOptions = [
  { value: 'healthy', label: '健康', color: 'success' },
  { value: 'sick', label: '患病', color: 'error' },
  { value: 'in_experiment', label: '实验中', color: 'processing' },
  { value: 'deceased', label: '已死亡', color: 'default' },
  { value: 'quarantine', label: '隔离中', color: 'warning' },
];

const statusOptions = [
  { value: 'idle', label: '空闲', color: 'success' },
  { value: 'in_use', label: '使用中', color: 'processing' },
  { value: 'full', label: '满员', color: 'error' },
  { value: 'maintenance', label: '维护中', color: 'warning' },
];

const typeOptions = [
  { value: 'mouse', label: '小鼠笼' },
  { value: 'rat', label: '大鼠笼' },
  { value: 'rabbit', label: '兔笼' },
  { value: 'guinea_pig', label: '豚鼠笼' },
  { value: 'other', label: '其他' },
];

const CageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cageId = parseInt(id || '0', 10);

  const [loading, setLoading] = useState(false);
  const [cage, setCage] = useState<any>(null);
  const [animals, setAnimals] = useState<any[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [availableAnimals, setAvailableAnimals] = useState<any[]>([]);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<number[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchCageDetail = useCallback(async () => {
    if (!cageId) return;
    try {
      setLoading(true);
      const [cageRes, animalsRes] = await Promise.all([
        cageApi.getDetail(cageId),
        cageApi.getAnimals(cageId),
      ]);
      setCage(cageRes);
      setAnimals(Array.isArray(animalsRes) ? animalsRes : []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [cageId]);

  useEffect(() => {
    fetchCageDetail();
  }, [fetchCageDetail]);

  const fetchAvailableAnimals = useCallback(async (keyword?: string) => {
    try {
      const res: any = await cageApi.getAvailableAnimals(cageId, keyword);
      setAvailableAnimals(Array.isArray(res) ? res : []);
    } catch {
      // handled
    }
  }, [cageId]);

  const handleOpenAssign = () => {
    setSelectedAnimalIds([]);
    setSearchKeyword('');
    setAssignModalVisible(true);
    fetchAvailableAnimals();
  };

  const handleAssignSearch = (value: string) => {
    setSearchKeyword(value);
    fetchAvailableAnimals(value);
  };

  const handleAssign = async () => {
    if (selectedAnimalIds.length === 0) {
      message.warning('请选择要分配的动物');
      return;
    }
    try {
      setAssignLoading(true);
      await cageApi.assignAnimals(cageId, selectedAnimalIds);
      message.success(`成功分配 ${selectedAnimalIds.length} 只动物`);
      setAssignModalVisible(false);
      fetchCageDetail();
    } catch {
      // handled
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveAnimal = async (animalId: number) => {
    try {
      await cageApi.removeAnimal(cageId, animalId);
      message.success('已移出动物');
      fetchCageDetail();
    } catch {
      // handled
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 100) return '#ff4d4f';
    if (rate >= 80) return '#faad14';
    if (rate >= 50) return '#1890ff';
    return '#52c41a';
  };

  const getAvailableSlots = () => {
    if (!cage) return 0;
    return Math.max(0, cage.maxCapacity - cage.currentCount);
  };

  const isNearFull = cage && cage.occupancyRate >= 80 && cage.occupancyRate < 100;
  const isFull = cage && cage.currentCount >= cage.maxCapacity;
  const isMaintenance = cage && cage.status === 'maintenance';
  const canAssign = !isFull && !isMaintenance;

  const animalColumns = [
    {
      title: '编号',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    { title: '物种', dataIndex: 'species', key: 'species', width: 100 },
    { title: '品系', dataIndex: 'breed', key: 'breed', ellipsis: true },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (g: string) => {
        const map: Record<string, string> = { male: '雄性', female: '雌性', unknown: '未知' };
        return map[g] || g;
      },
    },
    {
      title: '体重(g)',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (w: number) => w ? `${w}g` : '-',
    },
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
          title="确定将该动物移出此笼舍吗？"
          onConfirm={() => handleRemoveAnimal(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            移出
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const availableColumns = [
    { title: '选择', key: 'select', width: 60 },
    { title: '编号', dataIndex: 'name', key: 'name', width: 100 },
    { title: '物种', dataIndex: 'species', key: 'species', width: 80 },
    { title: '品系', dataIndex: 'breed', key: 'breed', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const opt = animalStatusOptions.find(o => o.value === status);
        return <Tag color={opt?.color}>{opt?.label || status}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!cage) {
    return <Empty description="笼舍不存在" />;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/cages')}>
            返回列表
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            <Space>
              <HomeOutlined style={{ color: '#4f46e5' }} />
              笼舍详情 - {cage.cageCode}
            </Space>
          </Title>
        </Space>
      </div>

      {isMaintenance && (
        <Alert
          message="该笼舍正在维护中"
          description="维护期间无法分配动物，请先将笼舍状态改为其他状态后再操作。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isFull && !isMaintenance && (
        <Alert
          message="笼舍已满员"
          description={`该笼舍最大容量 ${cage.maxCapacity} 只，当前已养 ${cage.currentCount} 只，无法再分配更多动物。`}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {isNearFull && (
        <Alert
          message="笼舍即将满员"
          description={`当前已养 ${cage.currentCount}/${cage.maxCapacity} 只，占用率 ${cage.occupancyRate}%，请注意控制数量。`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
            <Descriptions column={1} size="small" title="基本信息">
              <Descriptions.Item label="笼舍编号">
                <Text strong>{cage.cageCode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="所在房间">{cage.room}</Descriptions.Item>
              <Descriptions.Item label="笼舍类型">
                {typeOptions.find(o => o.value === cage.type)?.label}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusOptions.find(o => o.value === (cage.computedStatus || cage.status))?.color}>
                  {statusOptions.find(o => o.value === (cage.computedStatus || cage.status))?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="备注">{cage.description || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="当前饲养"
                  value={cage.currentCount}
                  suffix={`/ ${cage.maxCapacity} 只`}
                  valueStyle={{ color: getOccupancyColor(cage.occupancyRate) }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="剩余空位"
                  value={getAvailableSlots()}
                  suffix="只"
                  valueStyle={{ color: getAvailableSlots() === 0 ? '#ff4d4f' : '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="占用率"
                  value={cage.occupancyRate}
                  suffix="%"
                  valueStyle={{ color: getOccupancyColor(cage.occupancyRate) }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Progress
                percent={cage.occupancyRate}
                strokeColor={getOccupancyColor(cage.occupancyRate)}
                format={(p) => `${cage.currentCount} / ${cage.maxCapacity} (${p}%)`}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginTop: 16 }}
        title={<span style={{ fontWeight: 600 }}>笼内动物列表 ({animals.length}只)</span>}
        extra={
          <Tooltip title={!canAssign ? (isMaintenance ? '维护中无法分配' : '笼舍已满') : '分配动物'}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAssign}
              disabled={!canAssign}
            >
              分配动物
            </Button>
          </Tooltip>
        }
      >
        <Table
          dataSource={animals}
          columns={animalColumns}
          rowKey="id"
          scroll={{ x: 700 }}
          pagination={false}
          locale={{ emptyText: <Empty description="该笼舍暂无动物" /> }}
        />
      </Card>

      <Modal
        title="分配动物到笼舍"
        open={assignModalVisible}
        onOk={handleAssign}
        onCancel={() => setAssignModalVisible(false)}
        width={680}
        okText="确认分配"
        cancelText="取消"
        confirmLoading={assignLoading}
        okButtonProps={{ disabled: selectedAnimalIds.length === 0 }}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message={`笼舍剩余空位: ${getAvailableSlots()} 个，最多可再分配 ${getAvailableSlots()} 只动物`}
            type={getAvailableSlots() <= 1 ? 'warning' : 'info'}
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Input
            placeholder="搜索动物编号或物种"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={(e: any) => handleAssignSearch(e.target.value)}
            style={{ width: '100%' }}
            allowClear
            suffix={
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => handleAssignSearch(searchKeyword)} />
            }
          />
        </div>

        <Table
          dataSource={availableAnimals}
          rowKey="id"
          size="small"
          scroll={{ y: 320 }}
          pagination={false}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedAnimalIds,
            onChange: (keys) => {
              const selected = keys as number[];
              if (selected.length > getAvailableSlots()) {
                message.warning(`最多只能选择 ${getAvailableSlots()} 只动物`);
                setSelectedAnimalIds(selected.slice(0, getAvailableSlots()));
              } else {
                setSelectedAnimalIds(selected);
              }
            },
            getCheckboxProps: () => ({
              disabled: selectedAnimalIds.length >= getAvailableSlots(),
            }),
          }}
          locale={{ emptyText: <Empty description="暂无可分配的动物" /> }}
        >
          <Table.Column title="编号" dataIndex="name" width={100} />
          <Table.Column title="物种" dataIndex="species" width={80} />
          <Table.Column title="品系" dataIndex="breed" ellipsis />
          <Table.Column
            title="状态"
            dataIndex="status"
            width={90}
            render={(status: string) => {
              const opt = animalStatusOptions.find(o => o.value === status);
              return <Tag color={opt?.color}>{opt?.label || status}</Tag>;
            }}
          />
        </Table>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Text type="secondary">已选择 {selectedAnimalIds.length} 只动物</Text>
        </div>
      </Modal>
    </div>
  );
};

export default CageDetail;
