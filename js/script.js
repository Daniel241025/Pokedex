/* ---------- Elementos ---------- */
const pokemonName = document.querySelector(".pokemon__name");
const pokemonNumber = document.querySelector(".pokemon__number");
const pokemonImage = document.querySelector(".pokemon__image");

const form = document.querySelector(".form");
const input = document.querySelector(".input__search");
const suggestionsList = document.querySelector(".suggestions");
const buttonPrev = document.querySelector(".btn-prev");
const buttonNext = document.querySelector(".btn-next");

const detailsSection = document.querySelector(".details");
const typesContainer = document.querySelector(".types");
const descriptionEl = document.querySelector(".description");
const heightEl = document.querySelector(".height");
const weightEl = document.querySelector(".weight");
const abilitiesEl = document.querySelector(".abilities");
const statsContainer = document.querySelector(".stats");
const btnAddTeam = document.querySelector(".btn-add-team");

const teamSlotsContainer = document.querySelector(".team-slots");
const teamNameInput = document.querySelector(".input__team-name");
const btnSaveTeam = document.querySelector(".btn-save-team");
const btnClearTeam = document.querySelector(".btn-clear-team");

const savedTeamsList = document.querySelector(".saved-teams__list");

/* ---------- Estado ---------- */
let searchPokemon = 1;
let currentPokemon = null; // dados completos do pokémon exibido no momento
let allPokemonList = []; // { name, id } de todos os pokémon, para autocomplete
let activeSuggestionIndex = -1;
let currentTeam = []; // pokémon selecionados para a equipe em construção (máx. 6)

const TEAMS_STORAGE_KEY = "pokedex_saved_teams";
const TOTAL_TEAM_SLOTS = 6;

/* ---------- Cores por tipo ---------- */
const TYPE_COLORS = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

/* ---------- Utilidades ---------- */
const debounce = (fn, delay = 400) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const capitalize = (text) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

const setTerrain = (primaryType) => {
  const color = TYPE_COLORS[primaryType] || "#6ab7f5";
  document.documentElement.style.setProperty("--terrain-1", color);
  document.documentElement.style.setProperty("--terrain-2", "#ffffff");
};

/* ---------- API ---------- */
const fetchPokemon = async (pokemon) => {
  try {
    const APIResponse = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemon}`,
    );
    if (APIResponse.status === 200) {
      return await APIResponse.json();
    }
  } catch (error) {
    console.error("Erro ao buscar pokémon:", error);
  }
  return null;
};

const fetchSpecies = async (id) => {
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species/${id}`,
    );
    if (response.status === 200) {
      return await response.json();
    }
  } catch (error) {
    console.error("Erro ao buscar espécie:", error);
  }
  return null;
};

const fetchAllPokemonNames = async () => {
  try {
    const response = await fetch(
      "https://pokeapi.co/api/v2/pokemon?limit=2000",
    );
    if (response.status === 200) {
      const data = await response.json();
      allPokemonList = data.results.map((entry) => {
        const parts = entry.url.split("/").filter(Boolean);
        const id = parts[parts.length - 1];
        return { name: entry.name, id };
      });
    }
  } catch (error) {
    console.error("Erro ao carregar lista de pokémon:", error);
  }
};

/* ---------- Renderização principal ---------- */
const renderPokemon = async (pokemon) => {
  if (!pokemon) return;

  pokemonName.innerHTML = "Loading...";
  pokemonNumber.innerHTML = "";
  hideSuggestions();

  const data = await fetchPokemon(String(pokemon).toLowerCase());

  if (data) {
    currentPokemon = data;
    pokemonImage.style.display = "block";
    pokemonName.innerHTML = data.name;
    pokemonNumber.innerHTML = data.id;
    pokemonImage.src =
      data.sprites?.versions?.["generation-v"]?.["black-white"]?.animated
        ?.front_default || data.sprites?.front_default;
    input.value = "";
    searchPokemon = data.id;

    renderDetails(data);
    setTerrain(data.types[0]?.type?.name);
    updateAddTeamButtonState();
  } else {
    currentPokemon = null;
    pokemonImage.style.display = "none";
    pokemonName.innerHTML = "Not found :c";
    pokemonNumber.innerHTML = "";
    detailsSection.classList.add("hidden");
  }
};

const renderDetails = async (data) => {
  detailsSection.classList.remove("hidden");

  // Tipos
  typesContainer.innerHTML = "";
  data.types.forEach(({ type }) => {
    const badge = document.createElement("span");
    badge.className = "type-badge";
    badge.textContent = type.name;
    badge.style.backgroundColor = TYPE_COLORS[type.name] || "#777";
    typesContainer.appendChild(badge);
  });

  // Altura e peso (API usa decímetros e hectogramas)
  heightEl.textContent = `${(data.height / 10).toFixed(1)} m`;
  weightEl.textContent = `${(data.weight / 10).toFixed(1)} kg`;

  // Habilidades
  abilitiesEl.textContent = data.abilities
    .map((a) => capitalize(a.ability.name.replace("-", " ")))
    .join(", ");

  // Estatísticas base
  const statLabels = {
    hp: "HP",
    attack: "ATK",
    defense: "DEF",
    "special-attack": "SP.ATK",
    "special-defense": "SP.DEF",
    speed: "SPD",
  };
  statsContainer.innerHTML = "";
  data.stats.forEach((stat) => {
    const statName = statLabels[stat.stat.name] || stat.stat.name;
    const value = stat.base_stat;
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-name">${statName}</span>
      <div class="stat-bar"><div class="stat-bar__fill" style="width:${Math.min((value / 180) * 100, 100)}%"></div></div>
      <span class="stat-value">${value}</span>
    `;
    statsContainer.appendChild(row);
  });

  // Descrição (Pokédex flavor text)
  descriptionEl.textContent = "Carregando descrição...";
  const species = await fetchSpecies(data.id);
  if (species) {
    const entry = species.flavor_text_entries.find(
      (e) => e.language.name === "en",
    );
    if (entry) {
      descriptionEl.textContent = entry.flavor_text
        .replace(/\f|\n|\r/g, " ")
        .trim();
    } else {
      descriptionEl.textContent = "";
    }
  } else {
    descriptionEl.textContent = "";
  }
};

/* ---------- Autocomplete ---------- */
const showSuggestions = (query) => {
  activeSuggestionIndex = -1;

  if (!query) {
    hideSuggestions();
    return;
  }

  const isNumeric = /^\d+$/.test(query);
  const matches = allPokemonList
    .filter((p) => (isNumeric ? p.id === query : p.name.includes(query)))
    .sort((a, b) => {
      if (isNumeric) return 0;
      const aStarts = a.name.startsWith(query) ? 0 : 1;
      const bStarts = b.name.startsWith(query) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, 8);

  if (matches.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsList.innerHTML = "";
  matches.forEach((match) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${capitalize(match.name)}</span><span class="suggestion__number">#${String(match.id).padStart(3, "0")}</span>`;
    li.addEventListener("click", () => {
      renderPokemon(match.name);
    });
    suggestionsList.appendChild(li);
  });

  suggestionsList.classList.remove("hidden");
};

const hideSuggestions = () => {
  suggestionsList.classList.add("hidden");
  suggestionsList.innerHTML = "";
  activeSuggestionIndex = -1;
};

const moveActiveSuggestion = (direction) => {
  const items = Array.from(suggestionsList.querySelectorAll("li"));
  if (items.length === 0) return;

  items[activeSuggestionIndex]?.classList.remove("active");
  activeSuggestionIndex =
    (activeSuggestionIndex + direction + items.length) % items.length;
  items[activeSuggestionIndex].classList.add("active");
  items[activeSuggestionIndex].scrollIntoView({ block: "nearest" });
};

/* ---------- Busca com debounce (sem precisar de Enter) ---------- */
const debouncedSearch = debounce((value) => {
  if (value) renderPokemon(value);
}, 600);

input.addEventListener("input", () => {
  const value = input.value.trim().toLowerCase();
  showSuggestions(value);
  if (value) debouncedSearch(value);
});

input.addEventListener("keydown", (event) => {
  const items = suggestionsList.querySelectorAll("li");
  if (suggestionsList.classList.contains("hidden") || items.length === 0)
    return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveActiveSuggestion(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    moveActiveSuggestion(-1);
  } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
    event.preventDefault();
    items[activeSuggestionIndex].click();
  } else if (event.key === "Escape") {
    hideSuggestions();
  }
});

document.addEventListener("click", (event) => {
  if (!form.contains(event.target)) hideSuggestions();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim().toLowerCase();
  if (value) renderPokemon(value);
});

/* ---------- Navegação prev/next ---------- */
buttonPrev.addEventListener("click", () => {
  if (searchPokemon > 1) {
    searchPokemon -= 1;
    renderPokemon(searchPokemon);
  }
});

buttonNext.addEventListener("click", () => {
  searchPokemon += 1;
  renderPokemon(searchPokemon);
});

/* ---------- Equipes ---------- */
const getSimplifiedPokemon = (data) => ({
  id: data.id,
  name: data.name,
  sprite:
    data.sprites?.versions?.["generation-v"]?.["black-white"]?.animated
      ?.front_default || data.sprites?.front_default,
  types: data.types.map((t) => t.type.name),
});

const updateAddTeamButtonState = () => {
  if (!currentPokemon) {
    btnAddTeam.disabled = true;
    return;
  }
  const alreadyInTeam = currentTeam.some((p) => p.id === currentPokemon.id);
  btnAddTeam.disabled = alreadyInTeam || currentTeam.length >= TOTAL_TEAM_SLOTS;
  btnAddTeam.textContent = alreadyInTeam
    ? "Já está na equipe"
    : currentTeam.length >= TOTAL_TEAM_SLOTS
      ? "Equipe completa"
      : "+ Adicionar à equipe";
};

const renderTeamSlots = () => {
  teamSlotsContainer.innerHTML = "";
  for (let i = 0; i < TOTAL_TEAM_SLOTS; i += 1) {
    const slot = document.createElement("div");
    const pokemon = currentTeam[i];

    if (pokemon) {
      slot.className = "team-slot filled";
      slot.innerHTML = `
        <img src="${pokemon.sprite}" alt="${pokemon.name}" />
        <button type="button" class="remove-slot" title="Remover">✕</button>
      `;
      slot.querySelector(".remove-slot").addEventListener("click", () => {
        currentTeam.splice(i, 1);
        renderTeamSlots();
        updateAddTeamButtonState();
      });
    } else {
      slot.className = "team-slot";
    }

    teamSlotsContainer.appendChild(slot);
  }
};

btnAddTeam.addEventListener("click", () => {
  if (!currentPokemon || currentTeam.length >= TOTAL_TEAM_SLOTS) return;
  if (currentTeam.some((p) => p.id === currentPokemon.id)) return;

  currentTeam.push(getSimplifiedPokemon(currentPokemon));
  renderTeamSlots();
  updateAddTeamButtonState();
});

btnClearTeam.addEventListener("click", () => {
  currentTeam = [];
  teamNameInput.value = "";
  renderTeamSlots();
  updateAddTeamButtonState();
});

/* ---------- Persistência de equipes (localStorage) ---------- */
const loadSavedTeams = () => {
  try {
    return JSON.parse(localStorage.getItem(TEAMS_STORAGE_KEY)) || {};
  } catch (error) {
    console.error("Erro ao ler equipes salvas:", error);
    return {};
  }
};

const persistTeams = (teams) => {
  localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
};

const renderSavedTeams = () => {
  const teams = loadSavedTeams();
  const names = Object.keys(teams);

  savedTeamsList.innerHTML = "";

  if (names.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "Nenhuma equipe salva ainda.";
    savedTeamsList.appendChild(empty);
    return;
  }

  names.forEach((name) => {
    const members = teams[name];
    const card = document.createElement("div");
    card.className = "saved-team";
    card.innerHTML = `
      <div class="saved-team__header">
        <span class="saved-team__name">${name}</span>
        <div class="saved-team__actions">
          <button type="button" class="button btn-load-team">Carregar</button>
          <button type="button" class="button btn-delete-team">Excluir</button>
        </div>
      </div>
      <div class="saved-team__members">
        ${members
          .map(
            (m) =>
              `<img src="${m.sprite}" alt="${m.name}" title="${capitalize(m.name)}" />`,
          )
          .join("")}
      </div>
    `;

    card.querySelector(".btn-load-team").addEventListener("click", () => {
      currentTeam = members.map((m) => ({ ...m }));
      renderTeamSlots();
      updateAddTeamButtonState();
      teamNameInput.value = name;
      document
        .querySelector(".team-builder")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    });

    card.querySelector(".btn-delete-team").addEventListener("click", () => {
      const teamsNow = loadSavedTeams();
      delete teamsNow[name];
      persistTeams(teamsNow);
      renderSavedTeams();
    });

    savedTeamsList.appendChild(card);
  });
};

btnSaveTeam.addEventListener("click", () => {
  const name = teamNameInput.value.trim();

  if (!name) {
    teamNameInput.focus();
    return;
  }
  if (currentTeam.length === 0) return;

  const teams = loadSavedTeams();
  teams[name] = currentTeam;
  persistTeams(teams);
  renderSavedTeams();
});

/* ---------- Inicialização ---------- */
(async () => {
  renderTeamSlots();
  updateAddTeamButtonState();
  renderSavedTeams();
  fetchAllPokemonNames();
  await renderPokemon(searchPokemon);
})();
