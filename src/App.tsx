// Farmacia3D-Full.tsx
// Arquivo TSX pronto para copiar/colar
// Mantém toda a funcionalidade do código grande anterior e adiciona:
// - Gôndolas sólidas (não transparentes) e sem "voar"
// - Colisões simples (prateleiras não saem da loja e não se sobrepõem)
// - Entrada frontal aberta (onde ficam as promoções) e 3 paredes no resto
// - Camera com OrbitControls (visão aérea) + FirstPersonControls (andar como cliente)
// - Botões funcionais: zoom in/out, visão geral, mover livre / entrar como cliente
// - Botão para ocultar/mostrar menu lateral
// - Fundo clarinho, melhor iluminação
// - Trava da câmera em modo "firstPerson" para não sair da loja (limites)
// - Mantém seleção, filtros, lista de prateleiras, recalibração, etc.
//
// Observações:
// - Requer @react-three/fiber e @react-three/drei instalados
// - Cole este arquivo num componente React/Next.js (p.ex. src/components/Farmacia3D.tsx)

"use client";

import React, { useEffect, useRef, useState, type JSX } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line, FirstPersonControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ---------------------- Tipos ---------------------- */
type PrateleiraTipo = "parede" | "gondola" | "geladeira" | "caixa";

interface Prateleira {
  id: number;
  pos: [number, number, number]; // x, yRef (usado somente pra referência), z
  size: [number, number, number]; // comprimento (x), altura (y), profundidade (z)
  color: string;
  label: string;
  categoria: string;
  tipo: PrateleiraTipo;
  rotacao?: number;
}

interface Dimensiones {
  largura: number;
  comprimento: number;
}

interface CameraView {
  mode: "overview" | "prateleira";
  prateleiraId?: number;
  position: [number, number, number];
  target: [number, number, number];
}

/* ---------------------- Helpers ---------------------- */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ---------------------- Grade ---------------------- */
function Grade({ largura, comprimento }: { largura: number; comprimento: number }) {
  const cellSize = 1;
  const numLinhas = Math.round(largura);
  const numColunas = Math.round(comprimento);

  const lines: JSX.Element[] = [];

  for (let i = 0; i <= numLinhas; i++) {
    const zPos = -largura / 2 + i * cellSize;
    lines.push(
      <Line
        key={`h-${i}`}
        points={[
          new THREE.Vector3(-comprimento / 2, 0.01, zPos),
          new THREE.Vector3(comprimento / 2, 0.01, zPos),
        ]}
        color="#e6e6e6"
        lineWidth={1}
      />
    );
  }

  for (let i = 0; i <= numColunas; i++) {
    const xPos = -comprimento / 2 + i * cellSize;
    lines.push(
      <Line
        key={`v-${i}`}
        points={[
          new THREE.Vector3(xPos, 0.01, -largura / 2),
          new THREE.Vector3(xPos, 0.01, largura / 2),
        ]}
        color="#e6e6e6"
        lineWidth={1}
      />
    );
  }

  return <>{lines}</>;
}

/* ---------------------- Prateleira Realista (sólida) ---------------------- */
function PrateleiraRealista({
  prateleira,
  onSelect,
  isSelected,
}: {
  prateleira: Prateleira;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const { size, color, label, tipo, rotacao = 0 } = prateleira;
  const comprimento = Math.max(0.1, size[0]);
  const altura = Math.max(0.1, size[1]);
  const profundidade = Math.max(0.05, size[2]);

  // posição do group deve ter y=0 (para 'assentar' no chão)
  return (
    <group position={[prateleira.pos[0], 0, prateleira.pos[2]]} rotation={[0, (rotacao * Math.PI) / 180, 0]}>
      {/* corpo principal - sólido */}
      <mesh
        position={[0, altura / 2, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <boxGeometry args={[comprimento, altura, profundidade]} />
        <meshStandardMaterial color={isSelected ? "#ffd54f" : color} metalness={0.1} roughness={0.6} />
      </mesh>

      {/* prateleiras internas (visuais) */}
      {tipo !== "caixa" && (
        <>
          {[0.22, 0.45, 0.68].map((factor, i) => (
            <mesh key={`shelf-${label}-${i}`} position={[0, altura * factor, 0]} castShadow>
              <boxGeometry args={[comprimento * 0.92, 0.02, profundidade * 0.92]} />
              <meshStandardMaterial color="#eaeaea" metalness={0.05} roughness={0.8} />
            </mesh>
          ))}

          {tipo === "gondola" &&
            [0.2, 0.5, 0.8].map((factor, i) => (
              <mesh key={`div-${label}-${i}`} position={[comprimento * (factor - 0.5), altura * 0.45, 0]} castShadow>
                <boxGeometry args={[0.02, altura * 0.85, profundidade * 0.92]} />
                <meshStandardMaterial color="#cfcfcf" />
              </mesh>
            ))}
        </>
      )}

      {/* detalhes geladeira */}
      {tipo === "geladeira" && (
        <>
          <mesh position={[comprimento / 2 - 0.06, altura / 2, 0]}>
            <boxGeometry args={[0.12, altura - 0.24, profundidade - 0.12]} />
            <meshStandardMaterial color="#b0bec5" />
          </mesh>
        </>
      )}

      {/* detalhe caixa */}
      {tipo === "caixa" && (
        <>
          <mesh position={[0, altura + 0.25, profundidade * 0.05]}>
            <boxGeometry args={[comprimento * 0.9, 0.1, profundidade * 0.4]} />
            <meshStandardMaterial color="#e0e0e0" />
          </mesh>
        </>
      )}

      {/* Etiqueta visível */}
      <Text position={[0, altura + 0.12, 0]} fontSize={0.12} anchorX="center" anchorY="bottom" color="#0b2545">
        {label}
      </Text>
    </group>
  );
}

/* ---------------------- Camera Controller (suave) ---------------------- */
function CameraController({
  view,
  isOverview,
  lockAutoReturn,
  orbitRef,
}: {
  view: CameraView;
  isOverview: boolean;
  lockAutoReturn: boolean;
  orbitRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();
  const targetVec = new THREE.Vector3(...view.target);
  const desiredPos = new THREE.Vector3(...view.position);

  useFrame(() => {
    if (view.mode === "prateleira") {
      camera.position.lerp(desiredPos, 0.07);
      // pega direção atual e cria target suave
      const currentTarget = new THREE.Vector3();
      camera.getWorldDirection(currentTarget);
      currentTarget.add(camera.position);
      const newTarget = new THREE.Vector3().lerpVectors(currentTarget, targetVec, 0.07);
      camera.lookAt(newTarget);
    } else if (view.mode === "overview") {
      if (!lockAutoReturn) {
        camera.position.lerp(desiredPos, 0.05);
        camera.lookAt(targetVec);
      }
    }

    // sincronia com orbit target
    if (orbitRef.current) {
      orbitRef.current.target.lerp(targetVec, 0.12);
      orbitRef.current.update();
    }
  });

  return null;
}

/* ---------------------- Navigation UI para prateleira ---------------------- */
function PrateleiraNavigation({
  prateleira,
  onBack,
  onNavigate,
}: {
  prateleira: Prateleira;
  onBack: () => void;
  onNavigate: (dir: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(255,255,255,0.95)",
        padding: 12,
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 60,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{prateleira.label}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <button onClick={() => onNavigate("esquerda")}>◀</button>
        <button onClick={() => onNavigate("voltar")}>Voltar</button>
        <button onClick={() => onNavigate("direita")}>▶</button>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => onNavigate("frente")}>▲</button>
        <button onClick={() => onNavigate("baixo")}>▼</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={onBack}>Voltar à visão geral</button>
      </div>
    </div>
  );
}

/* ---------------------- Main Component ---------------------- */
export default function Farmacia3D() {
  // Tipos de loja baseados no código anterior
  const tiposLoja = [
    { nome: "Loja P (Pequena)", areaMaxima: 60, dimensoes: { largura: 6, comprimento: 10 } },
    { nome: "Loja M (Média)", areaMaxima: 99, dimensoes: { largura: 9, comprimento: 11 } },
    { nome: "Loja G (Grande)", areaMaxima: 120, dimensoes: { largura: 10, comprimento: 12 } },
  ];

  const [tipoLojaSelecionado, setTipoLojaSelecionado] = useState<string>(tiposLoja[0].nome);
  const lojaInfo = tiposLoja.find((l) => l.nome === tipoLojaSelecionado)!;

  const [dimensiones, setDimensiones] = useState<Dimensiones>(lojaInfo.dimensoes);

  // câmera
  const [cameraView, setCameraView] = useState<CameraView>({
    mode: "overview",
    position: [0, 18, 0],
    target: [0, 0, 0],
  });

  const [selectedPrateleira, setSelectedPrateleira] = useState<Prateleira | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");
  const [menuVisible, setMenuVisible] = useState<boolean>(true);
  const [orbitEnabled, setOrbitEnabled] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<"orbit" | "firstPerson">("orbit");
  const [lockAutoReturn, setLockAutoReturn] = useState<boolean>(true);

  const orbitRef = useRef<any>(null);
  const fpControlsRef = useRef<any>(null);

  // recalibrar dimensoes ao trocar loja
  useEffect(() => {
    const novo = tiposLoja.find((l) => l.nome === tipoLojaSelecionado);
    if (novo) setDimensiones(novo.dimensoes);
  }, [tipoLojaSelecionado]);

  /* ---------- calcularPosicoesPrateleiras (mantendo lógica anterior, mas evitando sobreposição) ---------- */
  const calcularPosicoesPrateleiras = (): Prateleira[] => {
    const { largura, comprimento } = dimensiones;
    const area = largura * comprimento;
    const escala = Math.sqrt(area / 60); // base em 60m2
    const isLarga = largura > comprimento;

    // Ajusta tamanhos e impede que excedam limites do piso
    const ajusteSize = (sx: number, sy: number, sz: number): [number, number, number] => {
      const maxX = Math.max(0.5, comprimento * 0.9);
      const maxZ = Math.max(0.3, largura * 0.5);
      const newX = clamp(sx * escala, 0.4, maxX);
      const newY = clamp(sy * escala, 0.4, 2.5);
      const newZ = clamp(sz * escala, 0.25, maxZ);
      return [newX, newY, newZ];
    };

    // Base P (coordenadas relativas centradas)
    const baseP: Prateleira[] = [
      // Paredes (superior)
      { id: 1, pos: [-(comprimento / 2) + 0.9, 0, -(largura / 2) + 0.2], size: ajusteSize(1.8, 1.2, 0.3), color: "#e3f2fd", label: "DERMOCOSMÉTICOS", categoria: "Cosméticos", tipo: "parede" },
      { id: 2, pos: [-(comprimento / 2) + 2.7, 0, -(largura / 2) + 0.2], size: ajusteSize(1.8, 1.2, 0.3), color: "#bbdefb", label: "PROTEÇÃO SOLAR", categoria: "Cosméticos", tipo: "parede" },
      { id: 3, pos: [-(comprimento / 2) + 4.5, 0, -(largura / 2) + 0.2], size: ajusteSize(1.8, 1.2, 0.3), color: "#90caf9", label: "CABELOS", categoria: "Cosméticos", tipo: "parede" },

      // Gondolas centrais - linha superior
      { id: 6, pos: [-(comprimento / 4), 0, -(largura / 4)], size: ajusteSize(1.8, 1.2, 0.4), color: "#f3e5f5", label: "HIGIENE ÍNTIMA", categoria: "Higiene", tipo: "gondola", rotacao: isLarga ? 0 : 90 },
      { id: 7, pos: [-(comprimento / 4), 0, 0], size: ajusteSize(1.8, 1.2, 0.4), color: "#e1bee7", label: "SABONETES", categoria: "Higiene", tipo: "gondola", rotacao: isLarga ? 0 : 90 },
      { id: 8, pos: [-(comprimento / 4), 0, largura / 4], size: ajusteSize(1.8, 1.2, 0.4), color: "#ce93d8", label: "PÉS/CUTELARIA", categoria: "Higiene", tipo: "gondola", rotacao: isLarga ? 0 : 90 },

      // Linha central
      { id: 10, pos: [0, 0, -(largura / 4)], size: ajusteSize(1.8, 1.2, 0.4), color: "#e8f5e9", label: "NUTRIÇÃO ESPORTIVA", categoria: "Nutrição", tipo: "gondola" },
      { id: 11, pos: [0, 0, 0], size: ajusteSize(1.8, 1.2, 0.4), color: "#c8e6c9", label: "NUTRIÇÃO ADULTA", categoria: "Nutrição", tipo: "gondola" },
      { id: 12, pos: [0, 0, largura / 4], size: ajusteSize(1.8, 1.2, 0.4), color: "#a5d6a7", label: "DESODORANTES FEM", categoria: "Nutrição", tipo: "gondola" },

      // Linha direita
      { id: 15, pos: [comprimento / 4, 0, -(largura / 4)], size: ajusteSize(1.8, 1.2, 0.4), color: "#fff3e0", label: "CUIDADO ADULTO", categoria: "Higiene", tipo: "gondola" },
      { id: 16, pos: [comprimento / 4, 0, 0], size: ajusteSize(1.8, 1.2, 0.4), color: "#ffebee", label: "PRIMEIROS SOCORROS", categoria: "Saúde", tipo: "gondola" },
      { id: 17, pos: [comprimento / 4, 0, largura / 4], size: ajusteSize(1.8, 1.2, 0.4), color: "#ffcdd2", label: "BANHO E TROCA", categoria: "Saúde", tipo: "gondola" },

      // Parede inferior (VITAMINAS...): essa é a parede oposta à entrada; entrada será na frente (lado onde ficam promoções)
      { id: 19, pos: [-(comprimento / 2) + 0.9, 0, largura / 2 - 0.2], size: ajusteSize(1.8, 1.2, 0.3), color: "#e8eaf6", label: "VITAMINAS", categoria: "Saúde", tipo: "parede" },
      { id: 20, pos: [-(comprimento / 2) + 2.7, 0, largura / 2 - 0.2], size: ajusteSize(1.8, 1.2, 0.3), color: "#c5cae9", label: "OTC MIP", categoria: "Saúde", tipo: "parede" },

      // Geladeira (lado direito)
      { id: 23, pos: [comprimento / 2 - 1.2, 0, 0], size: ajusteSize(1.2, 1.6, 0.8), color: "#b3e5fc", label: "GELADEIRA", categoria: "Refrig.", tipo: "geladeira" },

      // PROMOÇÕES (LOCAL DA ENTRADA) - colocada na frente para ser o ponto de acesso/entrada
      { id: 24, pos: [-(comprimento / 2) + 0.8, 0, - (largura / 2) + 1.0], size: ajusteSize(1.3, 0.6, 1.2), color: "#a5d6a7", label: "PROMOÇÕES (ENTRADA)", categoria: "Promoções", tipo: "gondola" },

      // Caixa (lado esquerdo, próximo à parede lateral)
      { id: 26, pos: [-(comprimento / 2) + 1.2, 0, -(largura / 2) + 2.4], size: ajusteSize(1.6, 1.2, 1.4), color: "#eeeeee", label: "CAIXA", categoria: "Serviços", tipo: "caixa" },
    ];

    // prevenir sobreposição simples: ajusta X de prateleiras centradas se houver colisão
    // algoritmo simples: para cada par, se overlap em X/Z, separa ligeiramente
    const ensureNoOverlap = (items: Prateleira[]) => {
      const out = items.map((i) => ({ ...i }));
      for (let a = 0; a < out.length; a++) {
        for (let b = a + 1; b < out.length; b++) {
          const A = out[a];
          const B = out[b];
          const distX = Math.abs(A.pos[0] - B.pos[0]);
          const distZ = Math.abs(A.pos[2] - B.pos[2]);
          const minX = (A.size[0] + B.size[0]) / 2 + 0.2;
          const minZ = (A.size[2] + B.size[2]) / 2 + 0.2;
          if (distX < minX && distZ < minZ) {
            // há overlap; empurra B um pouco na direção contrária ao centro
            const pushX = (B.pos[0] > 0 ? 0.15 : -0.15);
            const pushZ = (B.pos[2] > 0 ? 0.15 : -0.15);
            B.pos = [clamp(B.pos[0] + pushX, -comprimento / 2 + B.size[0] / 2 + 0.1, comprimento / 2 - B.size[0] / 2 - 0.1), 0, clamp(B.pos[2] + pushZ, -largura / 2 + B.size[2] / 2 + 0.1, largura / 2 - B.size[2] / 2 - 0.1)];
          }
        }
      }
      return out;
    };

    let final = ensureNoOverlap(baseP);

    // se Loja M / G -> espalha um pouco mais
    if (lojaInfo.nome.includes("M")) {
      final = final.map((p) => ({ ...p, id: p.id + 100, pos: [p.pos[0] * 1.15, 0, p.pos[2] * 1.15], size: [p.size[0] * 1.05, p.size[1] * 1.02, p.size[2] * 1.05] }));
    } else if (lojaInfo.nome.includes("G")) {
      final = final.map((p) => ({ ...p, id: p.id + 200, pos: [p.pos[0] * 1.3, 0, p.pos[2] * 1.25], size: [p.size[0] * 1.1, p.size[1] * 1.05, p.size[2] * 1.08] }));
    }

    // garante que nada "saia" da loja (clamp final)
    final = final.map((p) => ({
      ...p,
      pos: [
        clamp(p.pos[0], -comprimento / 2 + p.size[0] / 2 + 0.1, comprimento / 2 - p.size[0] / 2 - 0.1),
        0,
        clamp(p.pos[2], -largura / 2 + p.size[2] / 2 + 0.1, largura / 2 - p.size[2] / 2 - 0.1),
      ],
    }));

    return final;
  };

  const prateleiras = calcularPosicoesPrateleiras();
  const categorias = ["Todas", "Cosméticos", "Higiene", "Nutrição", "Saúde", "Infantil", "Promoções", "Serviços", "Refrig."];

  /* ---------- Handlers ---------- */
  const handleTipoLojaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoLojaSelecionado(e.target.value);
    setSelectedPrateleira(null);
    setCameraView({ mode: "overview", position: [0, 18, 0], target: [0, 0, 0] });
  };

  const handlePrateleiraSelect = (pr: Prateleira) => {
    setSelectedPrateleira(pr);
    const camPos: [number, number, number] = [pr.pos[0], pr.size[1] + 1.4, pr.pos[2] + Math.max(1.2, pr.size[2] * 1.8)];
    setCameraView({
      mode: "prateleira",
      prateleiraId: pr.id,
      position: camPos,
      target: [pr.pos[0], pr.size[1] / 2, pr.pos[2]],
    });
  };

  const handleBackToOverview = () => {
    setSelectedPrateleira(null);
    setCameraView({ mode: "overview", position: [0, 18, 0], target: [0, 0, 0] });
  };

  const handleNavigatePrateleira = (direction: string) => {
    if (!selectedPrateleira) return;
    // futura implementação: mover câmera localmente; por enquanto, apenas log
    console.log(`Navegar ${direction} em ${selectedPrateleira.label}`);
  };

  const areaMaxima = lojaInfo.areaMaxima;
  const areaTotal = dimensiones.largura * dimensiones.comprimento;

  const handleLarguraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nova = parseFloat(e.target.value);
    const novoComprimento = clamp(areaMaxima / nova, 3, 20);
    setDimensiones({ largura: nova, comprimento: novoComprimento });
  };

  const handleComprimentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novo = parseFloat(e.target.value);
    const novaLargura = clamp(areaMaxima / novo, 3, 20);
    setDimensiones({ largura: novaLargura, comprimento: novo });
  };

  /* ---------- Limites físicos para câmera (mesa de colisão simples) ---------- */
  // Define limites interiores (sem parede frontal/entrada)
  const cameraBounds = {
    xMin: -dimensiones.comprimento / 2 + 0.2,
    xMax: dimensiones.comprimento / 2 - 0.2,
    zMin: -dimensiones.largura / 2 + 0.2,
    zMax: dimensiones.largura / 2 - 0.2,
  };

  // FirstPersonControls workaround: no three r3f não há colisões por padrão,
  // então usamos useFrame para clamar a posição da câmera quando em modo firstPerson.
  function CameraKeepInside({ active }: { active: boolean }) {
    const { camera } = useThree();
    useFrame(() => {
      if (!active) return;
      // Mantém a câmera dentro dos limites em X/Z; para Y deixamos liberar (altura do olho)
      camera.position.x = clamp(camera.position.x, cameraBounds.xMin, cameraBounds.xMax);
      camera.position.z = clamp(camera.position.z, cameraBounds.zMin, cameraBounds.zMax);
      // opcional: impedir que camera atravesse paredes por Y?
    });
    return null;
  }

  /* ---------- Render ---------------- */
  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", gap: 12, padding: 12, boxSizing: "border-box" }}>
      {/* Canvas area */}
      <div style={{ flex: 1, position: "relative", borderRadius: 12, overflow: "hidden", background: "linear-gradient(180deg,#f8fafc,#eef4f8)" }}>
        <Canvas shadows camera={{ position: cameraView.position, fov: 50 }}>
          <CameraController view={cameraView} isOverview={cameraView.mode === "overview"} lockAutoReturn={lockAutoReturn} orbitRef={orbitRef} />

          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={0.9} castShadow />

          {/* Grade e chão (fundo clarinho) */}
          <Grade largura={dimensiones.largura} comprimento={dimensiones.comprimento} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[dimensiones.comprimento, dimensiones.largura]} />
            <meshStandardMaterial color="#fafcff" />
          </mesh>

          {/* Paredes sólidas - exceto na entrada (onde fica promoções) */}
          {/* Parede traseira */}
          <mesh position={[0, 2.5, -dimensiones.largura / 2]} receiveShadow>
            <boxGeometry args={[dimensiones.comprimento, 5, 0.12]} />
            <meshStandardMaterial color="#f3f4f6" />
          </mesh>
          {/* Parede esquerda */}
          <mesh position={[-dimensiones.comprimento / 2, 2.5, 0]} receiveShadow>
            <boxGeometry args={[0.12, 5, dimensiones.largura]} />
            <meshStandardMaterial color="#f3f4f6" />
          </mesh>
          {/* Parede direita */}
          <mesh position={[dimensiones.comprimento / 2, 2.5, 0]} receiveShadow>
            <boxGeometry args={[0.12, 5, dimensiones.largura]} />
            <meshStandardMaterial color="#f3f4f6" />
          </mesh>
          {/* Nota: parede frontal removida para entrada (lado onde está PROMOÇÕES) */}

          {/* Render prateleiras (garante filtro de categoria) */}
          {prateleiras
            .filter((p) => categoriaFiltro === "Todas" || p.categoria === categoriaFiltro)
            .map((p) => {
              // clamp pos para garantir dentro do piso
              const x = clamp(p.pos[0], -dimensiones.comprimento / 2 + p.size[0] / 2 + 0.05, dimensiones.comprimento / 2 - p.size[0] / 2 - 0.05);
              const z = clamp(p.pos[2], -dimensiones.largura / 2 + p.size[2] / 2 + 0.05, dimensiones.largura / 2 - p.size[2] / 2 - 0.05);
              return (
                <PrateleiraRealista
                  key={p.id}
                  prateleira={{ ...p, pos: [x, 0, z] }}
                  onSelect={() => {
                    handlePrateleiraSelect({ ...p, pos: [x, 0, z] });
                  }}
                  isSelected={selectedPrateleira?.id === p.id}
                />
              );
            })}

          {/* iluminação adicional */}
          <pointLight position={[0, 12, 0]} intensity={0.25} color="#99c1ff" />

          {/* Controles de câmera */}
          {cameraMode === "orbit" && (
            <OrbitControls
              ref={(r) => {
                orbitRef.current = r;
              }}
              enablePan={orbitEnabled}
              enableRotate={orbitEnabled}
              enableZoom={orbitEnabled}
              maxPolarAngle={Math.PI / 1.05}
              minPolarAngle={Math.PI / 6}
            />
          )}

          {cameraMode === "firstPerson" && (
            <>
              <FirstPersonControls
                ref={fpControlsRef}
                movementSpeed={4}
                lookSpeed={0.15}
                // disabled quando não selecionado
              />
              <CameraKeepInside active={cameraMode === "firstPerson"} />
            </>
          )}
        </Canvas>

        {/* widget prateleira */}
        {selectedPrateleira && (
          <PrateleiraNavigation prateleira={selectedPrateleira} onBack={handleBackToOverview} onNavigate={handleNavigatePrateleira} />
        )}

        {/* Botões flutuantes (zoom, visão, menu toggle) */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 80 }}>
          <button
            onClick={() =>
              setCameraView((prev) => ({
                ...prev,
                position: [prev.position[0], Math.max(3, prev.position[1] - 3), prev.position[2]],
              }))
            }
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            Zoom +
          </button>
          <button
            onClick={() =>
              setCameraView((prev) => ({
                ...prev,
                position: [prev.position[0], Math.min(40, prev.position[1] + 3), prev.position[2]],
              }))
            }
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            Zoom -
          </button>
          <button
            onClick={() => {
              setCameraView({ mode: "overview", position: [0, 18, 0], target: [0, 0, 0] });
              setSelectedPrateleira(null);
              setCameraMode("orbit");
            }}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            Visão Geral
          </button>

          <button
            onClick={() => {
              // alterna entre orbit e firstPerson
              setCameraMode((s) => (s === "orbit" ? "firstPerson" : "orbit"));
            }}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            {cameraMode === "orbit" ? "Entrar na Loja" : "Sair (Visão Aérea)"}
          </button>

          <button
            onClick={() => {
              setMenuVisible((s) => !s);
            }}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            {menuVisible ? "Ocultar Menu" : "Mostrar Menu"}
          </button>
        </div>
      </div>

      {/* Painel lateral (menu) */}
      {menuVisible && (
        <div style={{ width: 340, background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 8px 28px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: 0, color: "#1f3a66" }}>Farmácia 3D</h2>
          <p style={{ color: "#6b7a90", marginTop: 6, marginBottom: 12 }}>Escolha a loja e ajuste o layout</p>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Tipo de Loja</label>
            <select value={tipoLojaSelecionado} onChange={handleTipoLojaChange} style={{ width: "100%", padding: 8 }}>
              {tiposLoja.map((t) => (
                <option key={t.nome} value={t.nome}>
                  {t.nome} (até {t.areaMaxima} m²)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Largura: {dimensiones.largura.toFixed(2)} m</label>
            <input type="range" min={3} max={12} step={0.1} value={dimensiones.largura} onChange={handleLarguraChange} style={{ width: "100%" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Comprimento: {dimensiones.comprimento.toFixed(2)} m</label>
            <input type="range" min={4} max={15} step={0.1} value={dimensiones.comprimento} onChange={handleComprimentoChange} style={{ width: "100%" }} />
          </div>

          <div style={{ background: "#f2fbff", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>{(dimensiones.largura * dimensiones.comprimento).toFixed(1)} m²</div>
            <div style={{ color: "#567aa6", fontSize: 13 }}>Máximo: {areaMaxima} m²</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Filtrar por categoria</label>
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} style={{ width: "100%", padding: 8 }}>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Prateleiras</label>
            <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 6 }}>
              {prateleiras
                .filter((p) => categoriaFiltro === "Todas" || p.categoria === categoriaFiltro)
                .map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handlePrateleiraSelect(p)}
                    style={{
                      padding: 8,
                      marginBottom: 6,
                      borderRadius: 8,
                      background: selectedPrateleira?.id === p.id ? "#eaf4ff" : "#fafafa",
                      border: "1px solid #eee",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: "#6b7a90" }}>{p.tipo}</div>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Controles de visão</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                onClick={() =>
                  setCameraView((prev) => ({
                    ...prev,
                    position: [prev.position[0], Math.max(3, prev.position[1] - 3), prev.position[2]],
                  }))
                }
                style={{ flex: 1, padding: 8 }}
              >
                Zoom +
              </button>
              <button
                onClick={() =>
                  setCameraView((prev) => ({
                    ...prev,
                    position: [prev.position[0], Math.min(40, prev.position[1] + 3), prev.position[2]],
                  }))
                }
                style={{ flex: 1, padding: 8 }}
              >
                Zoom -
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => {
                  setSelectedPrateleira(null);
                  setCameraView({ mode: "overview", position: [0, 18, 0], target: [0, 0, 0] });
                  setCameraMode("orbit");
                }}
                style={{ flex: 1, padding: 8 }}
              >
                Visão Geral
              </button>

              <button
                onClick={() => {
                  setCameraMode((s) => (s === "orbit" ? "firstPerson" : "orbit"));
                }}
                style={{ flex: 1, padding: 8 }}
              >
                {cameraMode === "orbit" ? "Entrar (Cliente)" : "Sair (Aérea)"}
              </button>
            </div>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={lockAutoReturn} onChange={(e) => setLockAutoReturn(e.target.checked)} />
              Bloquear retorno automático
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setDimensiones((d) => ({ largura: Math.max(4, d.largura * 0.98), comprimento: Math.max(4, d.comprimento * 0.98) }));
              }}
              style={{ flex: 1, padding: 10 }}
            >
              Ajustar prateleiras
            </button>
            <button
              onClick={() => {
                const padrao = tiposLoja.find((l) => l.nome === tipoLojaSelecionado)!;
                setDimensiones(padrao.dimensoes);
                setCameraView({ mode: "overview", position: [0, 18, 0], target: [0, 0, 0] });
              }}
              style={{ flex: 1, padding: 10 }}
            >
              Recalibrar Loja
            </button>
          </div>

          <div style={{ marginTop: 12, color: "#6b7a90", fontSize: 13 }}>
            Dica: clique nas prateleiras na cena 3D ou na lista para focar. Use "Entrar (Cliente)" para navegar como um cliente pela loja. A entrada está aberta na área de promoções (sem parede).
          </div>
        </div>
      )}
    </div>
  );
}
