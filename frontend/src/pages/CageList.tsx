import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Space, Tag, Input, Select, Modal, Form,
  InputNumber, message, Popconfirm, Typography, Tooltip, Progress,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { cageApi } from '../api';

const { Option } = Select;
const { TextArea } = Input;

const statusOptions = [
  { value: 'available', label: '空闲', color: 'default' },
  { value: 'in_use', label: '使用中', color: 'processing' },
  { value: 'full', label: '满员', color: 'error' },
  { value: 'maintenance', label: '维护中', color: 'warning' },
];

const cageTypeOptions = [
  '小鼠笼', '大鼠笼', '兔笼', '豚鼠笼', '通用笼',
];

const CageList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCage, setEditingCage] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await cageApi.getList({
        page, pageSize, keyword: keyword || undefined,
        status: statusFilter,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = () => {
    setEditingCage(null);
    form.resetFields();
    form.setFieldsValue({ status: 'available', maxCapacity: 5 });
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingCage(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await cageApi.delete(id);
      message.success('删除成功');
      fetchData();
    } catch {
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCage) {
        await cageApi.update(editingCage.id, values);
        message.success('更新成功');
      } else {
        await cageApi.create(values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchData();
    } catch {
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 100) return '#ff4d4f';
    if (rate >= 80) return '#faad14';
    if (rate >= 50) return '#1890ff';
    return '#52c41a';
  };

  const columns = [
    {
      title: '编号',
      dataIndex: 'cageNumber',
      key: 'cageNumber',
      width: 100,
      fixed: 'left' as const,
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    { title: '所在房间', dataIndex: 'room', key: 'room', width: 140 },
    { title: '笼舍类型', dataIndex: 'cageType', key: 'cageType', width: 100 },
    {
      title: '最大容量',
      dataIndex: 'maxCapacity',
      key: 'maxCapacity',
      width: 90,
      render: (v: number) => `${v} 只`,
    },
    {
      title: '已养数量',
      dataIndex: 'currentCount',
      key: 'currentCount',
      width: 90,
      render: (v: number, record: any) => {
        const isNearFull = record.maxCapacity > 0 && v / record.maxCapacity >= 0.8;
        return (
          <span style={{ color: isNearFull ? '#faad14' : undefined, fontWeight: isNearFull ? 600 : undefined }}>
            {v} 只
          </span>
        );
      },
    },
    {
      title: '占用率',
      dataIndex: 'occupancyRate',
      key: 'occupancyRate',
      width: 140,
      render: (rate: number, record: any) => (
        <Progress
          percent={rate}
          size="small"
          strokeColor={getOccupancyColor(rate)}
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const opt = statusOptions.find(o => o.value === status);
        return <Tag color={opt?.color}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/cages/${record.id}`)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="确定删除该笼舍吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Tooltip title="删除">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        title={<span style={{ fontWeight: 600 }}>笼舍管理</span>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增笼舍
          </Button>
        }
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="搜索笼舍编号"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => { setPage(1); fetchData(); }}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          >
            {statusOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setStatusFilter(undefined); setPage(1); }}>
            重置
          </Button>
        </div>

        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          scroll={{ x: 920 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条记录`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title={editingCage ? '编辑笼舍' : '新增笼舍'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="cageNumber" label="笼舍编号" rules={[{ required: true, message: '请输入笼舍编号' }]}>
              <Input placeholder="如 A-101" />
            </Form.Item>
            <Form.Item name="room" label="所在房间" rules={[{ required: true, message: '请输入所在房间' }]}>
              <Input placeholder="如 A栋1层-小鼠室" />
            </Form.Item>
            <Form.Item name="cageType" label="笼舍类型" rules={[{ required: true, message: '请选择笼舍类型' }]}>
              <Select placeholder="选择笼舍类型">
                {cageTypeOptions.map(t => <Option key={t} value={t}>{t}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="maxCapacity" label="最大容量" rules={[{ required: true, message: '请输入最大容量' }]}>
              <InputNumber style={{ width: '100%' }} min={1} max={100} placeholder="如 5" />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select>
                {statusOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="description" label="备注">
            <TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CageList;
