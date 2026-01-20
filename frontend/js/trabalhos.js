document.addEventListener('DOMContentLoaded', () => {

  // ================= SELECTS DE VIDRO =================
  const selectCor = document.getElementById('cor_vidro');
  const selectEspessura = document.getElementById('espessura_vidro');

  if (selectCor && selectEspessura) {
    carregarCoresVidro();

    selectCor.addEventListener('change', () => {
      carregarEspessurasVidro(selectCor.value);
    });
  }

  // ================= CLIENTES =================
  if (document.getElementById('btnCadastrar')) {
    document.getElementById('btnCadastrar').addEventListener('click', cadastrarCliente);
    carregarClientes();
  }

  // ================= PRODUTOS =================
  if (document.getElementById('btnCadastrarProduto')) {
    document.getElementById('btnCadastrarProduto').addEventListener('click', cadastrarProduto);
    carregarProdutos();
  }

  if (document.getElementById('btnCadastrarProdutoUnitario')) {
    document
      .getElementById('btnCadastrarProdutoUnitario')
      .addEventListener('click', cadastrarProdutoUnitario);
    carregarProdutosUnitarios();
  }

  // ================= ORÇAMENTOS =================
  if (document.getElementById('clienteSelect')) {
    carregarClientesSelect();
    carregarProdutosSelect();
    carregarOrcamentos();
  }
});


// ======================================================
// 🔹 VIDROS
// ======================================================

async function carregarCoresVidro() {
  const select = document.getElementById('cor_vidro');
  if (!select) return;

  const res = await fetch('/vidros/cores');
  const cores = await res.json();

  select.innerHTML = '<option value="">Selecione a cor</option>';

  cores.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.cor;
    opt.textContent = c.cor;
    select.appendChild(opt);
  });
}

async function carregarEspessurasVidro(cor) {
  const select = document.getElementById('espessura_vidro');
  if (!select) return;

  if (!cor) {
    select.innerHTML = '<option value="">Selecione a espessura</option>';
    select.disabled = true;
    return;
  }

  const res = await fetch(`/vidros/espessuras/${encodeURIComponent(cor)}`);
  const espessuras = await res.json();

  select.innerHTML = '<option value="">Selecione a espessura</option>';
  select.disabled = false;

  espessuras.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.espessura_mm;
    opt.textContent = `${e.espessura_mm} mm`;
    select.appendChild(opt);
  });
}

async function obterVidroId(cor, espessura) {
  if (!cor || !espessura) return null;

  const res = await fetch(
    `/vidros/id?cor=${encodeURIComponent(cor)}&espessura=${espessura}`
  );
  const data = await res.json();

  return data?.id || null;
}


// ======================================================
// 🔹 ORÇAMENTO
// ======================================================

async function adicionarItem() {
  const produtoSelect = document.getElementById('produtoSelect');
  const largura = Number(document.getElementById('largura').value || 0);
  const altura = Number(document.getElementById('altura').value || 0);
  const maoObra = Number(document.getElementById('maoObra').value || 0);

  const cor = document.getElementById('cor_vidro')?.value;
  const espessura = document.getElementById('espessura_vidro')?.value;

  if (!produtoSelect.value) {
    alert('Selecione um produto');
    return;
  }

  const tipoProduto =
    produtoSelect.options[produtoSelect.selectedIndex].dataset.tipo;

  if (tipoProduto === 'medida') {
    if (largura <= 0 || altura <= 0) {
      alert('Informe largura e altura válidas');
      return;
    }
  }

  let vidroId = null;
  if (cor && espessura) {
    vidroId = await obterVidroId(cor, espessura);
    if (!vidroId) {
      alert('Vidro não encontrado');
      return;
    }
  }

  itensOrcamento.push({
    produto_id: Number(produtoSelect.value),
    tipo: tipoProduto,
    largura: tipoProduto === 'medida' ? largura : null,
    altura: tipoProduto === 'medida' ? altura : null,
    mao_obra: maoObra,
    vidro_id: vidroId
  });

  const li = document.createElement('li');

  let texto = produtoSelect.options[produtoSelect.selectedIndex].text;

  if (tipoProduto === 'medida') {
    texto += ` - ${largura} x ${altura}`;
  }

  if (cor && espessura) {
    texto += ` | ${cor} ${espessura}mm`;
  }

  li.textContent = texto;
  document.getElementById('listaItens').appendChild(li);

  document.getElementById('largura').value = '';
  document.getElementById('altura').value = '';
}


// ======================================================
// 🔹 FINALIZAR ORÇAMENTO
// ======================================================

function finalizarOrcamento() {
  const clienteId = document.getElementById('clienteSelect').value;

  if (!clienteId) return alert('Selecione um cliente');
  if (itensOrcamento.length === 0) return alert('Adicione produtos');

  fetch('/orcamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente_id: clienteId,
      itens: itensOrcamento
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.erro) return alert(data.erro);

      alert('Orçamento criado com sucesso!');
      window.open(`/orcamentos/${data.id}/pdf`, '_blank');

      itensOrcamento = [];
      document.getElementById('listaItens').innerHTML = '';
    })
    .catch(() => alert('Erro ao finalizar orçamento'));
}


// ======================================================
// 🔹 DEMAIS FUNÇÕES (CLIENTES / PRODUTOS / LISTAGEM)
// 👉 MANTENHA AS SUAS ATUAIS
// ======================================================
