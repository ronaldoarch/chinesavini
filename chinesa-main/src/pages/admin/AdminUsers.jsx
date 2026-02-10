import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import './AdminUsers.css'

function AdminUsers() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin, page, search])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 20,
        ...(search && { search })
      }
      const response = await api.getAdminUsers(params)
      if (response.success) {
        setUsers(response.data.users)
        setTotalPages(response.data.pagination.pages)
      } else {
        setError(response.message || 'Erro ao carregar usuários')
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (userId, updates) => {
    try {
      const response = await api.updateAdminUser(userId, updates)
      if (response.success) {
        setEditingUser(null)
        loadUsers()
        if (selectedUser?._id === userId) {
          setSelectedUser(response.data.user)
        }
      } else {
        alert(response.message || 'Erro ao atualizar usuário')
      }
    } catch (err) {
      alert(err.message || 'Erro ao atualizar usuário')
    }
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0)

  const handleExportPDF = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/admin/users/export-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao exportar PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usuarios_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Erro ao exportar PDF: ' + err.message)
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-lock"></i>
          <h2>Acesso Negado</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-users"></i>
          Gerenciar Usuários
        </h1>
        <div className="admin-header-actions">
          <div className="admin-search">
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <button
            className="btn-export-pdf"
            onClick={handleExportPDF}
            disabled={loading}
            title="Exportar usuários em PDF"
          >
            <i className="fa-solid fa-file-pdf"></i>
            Exportar PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando usuários...</p>
        </div>
      ) : error ? (
        <div className="admin-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <p>{error}</p>
          <button onClick={loadUsers}>Tentar novamente</button>
        </div>
      ) : (
        <>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Telefone</th>
                  <th>Saldo</th>
                  <th>VIP</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.username}</td>
                      <td>{user.phone}</td>
                      <td className="amount">{formatCurrency(user.balance)}</td>
                      <td>
                        <span className="vip-badge">Nível {user.vipLevel}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <button
                          className="btn-action"
                          onClick={() => setSelectedUser(user)}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button
                          className="btn-action"
                          onClick={() => setEditingUser(user)}
                        >
                          <i className="fa-solid fa-edit"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes do Usuário</h2>
              <button onClick={() => setSelectedUser(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-item">
                <label>Username:</label>
                <span>{selectedUser.username}</span>
              </div>
              <div className="detail-item">
                <label>Telefone:</label>
                <span>{selectedUser.phone}</span>
              </div>
              <div className="detail-item">
                <label>Saldo:</label>
                <span className="amount">{formatCurrency(selectedUser.balance)}</span>
              </div>
              <div className="detail-item">
                <label>VIP Level:</label>
                <span>{selectedUser.vipLevel}</span>
              </div>
              <div className="detail-item">
                <label>Status:</label>
                <span className={`status-badge ${selectedUser.isActive ? 'active' : 'inactive'}`}>
                  {selectedUser.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="detail-item">
                <label>Cadastro:</label>
                <span>{new Date(selectedUser.createdAt).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Usuário</h2>
              <button onClick={() => setEditingUser(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <EditUserForm
              user={editingUser}
              onSave={handleEditUser}
              onCancel={() => setEditingUser(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EditUserForm({ user, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    balance: user.balance,
    vipLevel: user.vipLevel,
    isActive: user.isActive
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(user._id, formData)
  }

  return (
    <form className="edit-user-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Saldo:</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.balance}
          onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="form-group">
        <label>VIP Level:</label>
        <input
          type="number"
          min="0"
          max="8"
          value={formData.vipLevel}
          onChange={(e) => setFormData({ ...formData, vipLevel: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          Usuário Ativo
        </label>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit">Salvar</button>
      </div>
    </form>
  )
}

export default AdminUsers
